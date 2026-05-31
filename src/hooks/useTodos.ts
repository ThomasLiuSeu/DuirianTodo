import { useCallback, useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { familyId, hasSupabaseConfig } from "../lib/config";
import { supabase } from "../lib/supabase";
import type { Todo, TodoList } from "../types";

type TodoInsert = Pick<Todo, "title" | "family_id"> &
  Partial<Pick<Todo, "list_id" | "notes" | "due_date" | "sort_order">>;
type TodoUpdate = Partial<Pick<Todo, "title" | "notes" | "due_date" | "list_id" | "completed" | "completed_at">>;
type ListInsert = Pick<TodoList, "name" | "family_id" | "color"> & Partial<Pick<TodoList, "sort_order">>;

const initialLists: TodoList[] = [
  {
    id: "local-default",
    family_id: familyId,
    name: "家庭",
    color: "#0a84ff",
    sort_order: 0,
    created_at: new Date().toISOString(),
  },
];

const initialTodos: Todo[] = [
  {
    id: "local-sample",
    family_id: familyId,
    list_id: "local-default",
    title: "配置 Supabase 后开始共享家庭待办",
    notes: "复制 .env.example，执行 supabase/schema.sql，然后在 Vercel 设置环境变量。",
    due_date: null,
    completed: false,
    completed_at: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function useTodos() {
  const [lists, setLists] = useState<TodoList[]>(initialLists);
  const [todos, setTodos] = useState<Todo[]>(hasSupabaseConfig ? [] : initialTodos);
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"offline" | "connecting" | "online">(
    hasSupabaseConfig ? "connecting" : "offline",
  );

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const [listsResult, todosResult] = await Promise.all([
      supabase
        .from("lists")
        .select("*")
        .eq("family_id", familyId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("todos")
        .select("*")
        .eq("family_id", familyId)
        .order("completed", { ascending: true })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]);

    if (listsResult.error || todosResult.error) {
      setError(listsResult.error?.message || todosResult.error?.message || "同步失败");
      setSyncStatus("offline");
    } else {
      setLists(listsResult.data || []);
      setTodos(todosResult.data || []);
      setSyncStatus("online");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    const handleChange = (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      load();
    };

    const channel = client
      .channel(`family-todo-${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lists", filter: `family_id=eq.${familyId}` }, handleChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "todos", filter: `family_id=eq.${familyId}` }, handleChange)
      .subscribe((status) => {
        setSyncStatus(status === "SUBSCRIBED" ? "online" : "connecting");
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [load]);

  const ensureList = useCallback(async () => {
    if (lists.length > 0) return lists[0].id;
    if (!supabase) return initialLists[0].id;

    const insert: ListInsert = {
      family_id: familyId,
      name: "家庭",
      color: "#0a84ff",
      sort_order: 0,
    };
    const { data, error: insertError } = await supabase.from("lists").insert(insert).select("*").single();
    if (insertError) throw insertError;
    setLists((current) => [...current, data]);
    return data.id;
  }, [lists]);

  const createList = useCallback(
    async (name: string, color: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (!supabase) {
        const localList: TodoList = {
          id: crypto.randomUUID(),
          family_id: familyId,
          name: trimmed,
          color,
          sort_order: lists.length,
          created_at: new Date().toISOString(),
        };
        setLists((current) => [...current, localList]);
        return;
      }

      const insert: ListInsert = {
        family_id: familyId,
        name: trimmed,
        color,
        sort_order: lists.length,
      };
      const { error: insertError } = await supabase.from("lists").insert(insert);
      if (insertError) setError(insertError.message);
    },
    [lists.length],
  );

  const updateList = useCallback(async (id: string, updates: Partial<Pick<TodoList, "name" | "color">>) => {
    if (!supabase) {
      setLists((current) => current.map((list) => (list.id === id ? { ...list, ...updates } : list)));
      return;
    }
    const { error: updateError } = await supabase.from("lists").update(updates).eq("id", id).eq("family_id", familyId);
    if (updateError) setError(updateError.message);
  }, []);

  const deleteList = useCallback(async (id: string) => {
    if (!supabase) {
      setLists((current) => current.filter((list) => list.id !== id));
      setTodos((current) => current.map((todo) => (todo.list_id === id ? { ...todo, list_id: null } : todo)));
      return;
    }
    const { error: deleteError } = await supabase.from("lists").delete().eq("id", id).eq("family_id", familyId);
    if (deleteError) setError(deleteError.message);
  }, []);

  const createTodo = useCallback(
    async (title: string, options?: { listId?: string; dueDate?: string | null; notes?: string }) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const listId = options?.listId || (await ensureList());
      const now = new Date().toISOString();

      if (!supabase) {
        const localTodo: Todo = {
          id: crypto.randomUUID(),
          family_id: familyId,
          list_id: listId,
          title: trimmed,
          notes: options?.notes || null,
          due_date: options?.dueDate || null,
          completed: false,
          completed_at: null,
          sort_order: Date.now(),
          created_at: now,
          updated_at: now,
        };
        setTodos((current) => [localTodo, ...current]);
        return;
      }

      const insert: TodoInsert = {
        family_id: familyId,
        list_id: listId,
        title: trimmed,
        notes: options?.notes || null,
        due_date: options?.dueDate || null,
        sort_order: Date.now(),
      };
      const { error: insertError } = await supabase.from("todos").insert(insert);
      if (insertError) setError(insertError.message);
    },
    [ensureList],
  );

  const updateTodo = useCallback(async (id: string, updates: TodoUpdate) => {
    const normalized: TodoUpdate = { ...updates };
    if ("notes" in updates) normalized.notes = updates.notes === "" ? null : updates.notes ?? null;
    if ("due_date" in updates) normalized.due_date = updates.due_date === "" ? null : updates.due_date ?? null;

    if (!supabase) {
      setTodos((current) =>
        current.map((todo) => (todo.id === id ? { ...todo, ...normalized, updated_at: new Date().toISOString() } : todo)),
      );
      return;
    }
    const { error: updateError } = await supabase.from("todos").update(normalized).eq("id", id).eq("family_id", familyId);
    if (updateError) setError(updateError.message);
  }, []);

  const toggleTodo = useCallback(
    async (todo: Todo) => {
      await updateTodo(todo.id, {
        completed: !todo.completed,
        completed_at: todo.completed ? null : new Date().toISOString(),
      });
    },
    [updateTodo],
  );

  const deleteTodo = useCallback(async (id: string) => {
    if (!supabase) {
      setTodos((current) => current.filter((todo) => todo.id !== id));
      return;
    }
    const { error: deleteError } = await supabase.from("todos").delete().eq("id", id).eq("family_id", familyId);
    if (deleteError) setError(deleteError.message);
  }, []);

  return useMemo(
    () => ({
      lists,
      todos,
      loading,
      error,
      syncStatus,
      createList,
      updateList,
      deleteList,
      createTodo,
      updateTodo,
      toggleTodo,
      deleteTodo,
      reload: load,
    }),
    [
      lists,
      todos,
      loading,
      error,
      syncStatus,
      createList,
      updateList,
      deleteList,
      createTodo,
      updateTodo,
      toggleTodo,
      deleteTodo,
      load,
    ],
  );
}
