import { FormEvent, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Circle,
  Inbox,
  ListPlus,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { familyId, hasSupabaseConfig } from "./lib/config";
import { addDaysKey, formatDueDate, isOverdue, todayKey } from "./lib/date";
import { useTodos } from "./hooks/useTodos";
import type { ListColor, SmartView, Todo, TodoList, View } from "./types";

const colors: ListColor[] = ["#0a84ff", "#34c759", "#ff9500", "#ff2d55", "#af52de", "#5ac8fa"];

const smartViews: Array<View & { icon: typeof CalendarDays; accent: string }> = [
  { type: "smart", id: "today", title: "今天", icon: CalendarDays, accent: "#0a84ff" },
  { type: "smart", id: "upcoming", title: "近期", icon: CalendarClock, accent: "#ff9500" },
  { type: "smart", id: "all", title: "全部", icon: Inbox, accent: "#5ac8fa" },
  { type: "smart", id: "completed", title: "已完成", icon: CheckCircle2, accent: "#34c759" },
];

function App() {
  const store = useTodos();
  const [selectedView, setSelectedView] = useState<View>({ type: "smart", id: "today", title: "今天" });
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [listDraft, setListDraft] = useState("");
  const [listColor, setListColor] = useState<ListColor>("#0a84ff");

  const listMap = useMemo(() => new Map(store.lists.map((list) => [list.id, list])), [store.lists]);

  const visibleTodos = useMemo(() => {
    const today = todayKey();
    const soon = addDaysKey(7);
    return store.todos
      .filter((todo) => {
        if (selectedView.type === "list") return todo.list_id === selectedView.id;
        if (selectedView.id === "today") return !todo.completed && todo.due_date === today;
        if (selectedView.id === "upcoming") {
          return !todo.completed && Boolean(todo.due_date && todo.due_date > today && todo.due_date <= soon);
        }
        if (selectedView.id === "completed") return todo.completed;
        return !todo.completed;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
        if (a.due_date && b.due_date && a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date);
        if (a.due_date && !b.due_date) return -1;
        if (!a.due_date && b.due_date) return 1;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [selectedView, store.todos]);

  const counts = useMemo(() => {
    const today = todayKey();
    const soon = addDaysKey(7);
    return {
      today: store.todos.filter((todo) => !todo.completed && todo.due_date === today).length,
      upcoming: store.todos.filter((todo) => !todo.completed && todo.due_date && todo.due_date > today && todo.due_date <= soon)
        .length,
      all: store.todos.filter((todo) => !todo.completed).length,
      completed: store.todos.filter((todo) => todo.completed).length,
    };
  }, [store.todos]);

  const activeListId = selectedView.type === "list" ? selectedView.id : store.lists[0]?.id;

  async function handleCreateTodo(event: FormEvent) {
    event.preventDefault();
    await store.createTodo(draftTitle, {
      listId: activeListId,
      dueDate: draftDueDate || (selectedView.type === "smart" && selectedView.id === "today" ? todayKey() : null),
    });
    setDraftTitle("");
    setDraftDueDate("");
  }

  async function handleCreateList(event: FormEvent) {
    event.preventDefault();
    await store.createList(listDraft, listColor);
    setListDraft("");
    setListColor(colors[(colors.indexOf(listColor) + 1) % colors.length]);
  }

  const selectedTitle =
    selectedView.type === "list" ? store.lists.find((list) => list.id === selectedView.id)?.name || "列表" : selectedView.title;

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="待办导航">
        <div className="brand">
          <div>
            <p className="eyebrow">家庭共享</p>
            <h1>待办事项</h1>
          </div>
          <button className="icon-button" type="button" onClick={store.reload} aria-label="刷新">
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="sync-card">
          <span className={`sync-dot ${store.syncStatus}`} />
          <div>
            <strong>{store.syncStatus === "online" ? "正在同步" : store.syncStatus === "connecting" ? "连接中" : "本地预览"}</strong>
            <p>{hasSupabaseConfig ? `家庭空间：${familyId}` : "缺少 Supabase 环境变量"}</p>
          </div>
        </div>

        <nav className="smart-grid" aria-label="智能列表">
          {smartViews.map((view) => {
            const Icon = view.icon;
            return (
              <button
                className={`smart-card ${selectedView.type === "smart" && selectedView.id === view.id ? "active" : ""}`}
                key={view.id}
                type="button"
                onClick={() => setSelectedView({ type: "smart", id: view.id as SmartView, title: view.title })}
              >
                <span className="smart-icon" style={{ backgroundColor: view.accent }}>
                  <Icon size={18} />
                </span>
                <strong>{counts[view.id as SmartView]}</strong>
                <span>{view.title}</span>
              </button>
            );
          })}
        </nav>

        <section className="list-section" aria-labelledby="list-heading">
          <div className="section-title">
            <h2 id="list-heading">我的列表</h2>
            <ListPlus size={18} />
          </div>
          <div className="list-stack">
            {store.lists.map((list) => (
              <ListRow
                key={list.id}
                list={list}
                count={store.todos.filter((todo) => !todo.completed && todo.list_id === list.id).length}
                active={selectedView.type === "list" && selectedView.id === list.id}
                onSelect={() => setSelectedView({ type: "list", id: list.id, title: list.name })}
                onRename={(name) => store.updateList(list.id, { name })}
                onDelete={() => store.deleteList(list.id)}
              />
            ))}
          </div>
          <form className="new-list-form" onSubmit={handleCreateList}>
            <div className="color-picker" aria-label="列表颜色">
              {colors.map((color) => (
                <button
                  aria-label={`选择颜色 ${color}`}
                  className={color === listColor ? "selected" : ""}
                  key={color}
                  style={{ backgroundColor: color }}
                  type="button"
                  onClick={() => setListColor(color)}
                />
              ))}
            </div>
            <div className="inline-form">
              <input value={listDraft} onChange={(event) => setListDraft(event.target.value)} placeholder="新建列表" />
              <button type="submit" aria-label="添加列表">
                <Plus size={18} />
              </button>
            </div>
          </form>
        </section>
      </aside>

      <section className="content-pane" aria-label={selectedTitle}>
        <header className="content-header">
          <div>
            <p>{visibleTodos.length} 项</p>
            <h2>{selectedTitle}</h2>
          </div>
        </header>

        {store.error && (
          <div className="alert" role="alert">
            {store.error}
          </div>
        )}

        <form className="quick-add" onSubmit={handleCreateTodo}>
          <button type="submit" aria-label="添加待办">
            <Plus size={21} />
          </button>
          <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="新增待办事项" />
          <input
            aria-label="截止日期"
            className="date-input"
            type="date"
            value={draftDueDate}
            onChange={(event) => setDraftDueDate(event.target.value)}
          />
        </form>

        <div className="todo-list">
          {store.loading ? (
            <div className="empty-state">正在载入家庭待办...</div>
          ) : visibleTodos.length === 0 ? (
            <div className="empty-state">
              <Circle size={36} />
              <strong>这里很清爽</strong>
              <span>新增一个待办，或切换到其他列表看看。</span>
            </div>
          ) : (
            visibleTodos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                list={todo.list_id ? listMap.get(todo.list_id) : undefined}
                lists={store.lists}
                editing={editingTodoId === todo.id}
                onEdit={() => setEditingTodoId(todo.id)}
                onCloseEdit={() => setEditingTodoId(null)}
                onToggle={() => store.toggleTodo(todo)}
                onDelete={() => store.deleteTodo(todo.id)}
                onUpdate={(updates) => store.updateTodo(todo.id, updates)}
              />
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function ListRow({
  list,
  count,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  list: TodoList;
  count: number;
  active: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);

  function submitRename(event: FormEvent) {
    event.preventDefault();
    finishRename();
  }

  function finishRename() {
    const trimmed = name.trim();
    if (trimmed && trimmed !== list.name) onRename(trimmed);
    setName(trimmed || list.name);
    setRenaming(false);
  }

  if (renaming) {
    return (
      <form className="list-row active" onSubmit={submitRename}>
        <span className="list-color" style={{ backgroundColor: list.color }} />
        <input autoFocus value={name} onChange={(event) => setName(event.target.value)} onBlur={finishRename} />
      </form>
    );
  }

  return (
    <div className={`list-row ${active ? "active" : ""}`}>
      <button className="list-select" type="button" onClick={onSelect}>
        <span className="list-color" style={{ backgroundColor: list.color }} />
        <span>{list.name}</span>
        <strong>{count}</strong>
      </button>
      <span className="row-actions">
        <button type="button" aria-label="重命名列表" onClick={() => setRenaming(true)}>
          <MoreHorizontal size={16} />
        </button>
        <button type="button" aria-label="删除列表" onClick={onDelete}>
          <Trash2 size={16} />
        </button>
      </span>
    </div>
  );
}

function TodoRow({
  todo,
  list,
  lists,
  editing,
  onEdit,
  onCloseEdit,
  onToggle,
  onDelete,
  onUpdate,
}: {
  todo: Todo;
  list?: TodoList;
  lists: TodoList[];
  editing: boolean;
  onEdit: () => void;
  onCloseEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Pick<Todo, "title" | "notes" | "due_date" | "list_id">>) => void;
}) {
  const [title, setTitle] = useState(todo.title);
  const [notes, setNotes] = useState(todo.notes || "");
  const [dueDate, setDueDate] = useState(todo.due_date || "");
  const [listId, setListId] = useState(todo.list_id || "");

  function save(event: FormEvent) {
    event.preventDefault();
    onUpdate({
      title: title.trim() || todo.title,
      notes,
      due_date: dueDate || null,
      list_id: listId || null,
    });
    onCloseEdit();
  }

  return (
    <article className={`todo-row ${todo.completed ? "completed" : ""}`}>
      <button className="complete-button" type="button" aria-label={todo.completed ? "标记未完成" : "标记完成"} onClick={onToggle}>
        {todo.completed ? <CheckCircle2 size={24} /> : <Circle size={24} />}
      </button>

      {editing ? (
        <form className="todo-editor" onSubmit={save}>
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} />
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="备注" />
          <div className="editor-grid">
            <input aria-label="截止日期" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <select aria-label="所属列表" value={listId} onChange={(event) => setListId(event.target.value)}>
              <option value="">无列表</option>
              {lists.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="editor-actions">
            <button type="button" onClick={onCloseEdit}>
              取消
            </button>
            <button type="submit">保存</button>
          </div>
        </form>
      ) : (
        <>
          <button className="todo-main" type="button" onClick={onEdit}>
            <span>{todo.title}</span>
            {todo.notes && <small>{todo.notes}</small>}
            <span className="meta-line">
              <b className={isOverdue(todo.due_date, todo.completed) ? "overdue" : ""}>{formatDueDate(todo.due_date)}</b>
              {list && (
                <>
                  <i style={{ backgroundColor: list.color }} />
                  {list.name}
                </>
              )}
            </span>
          </button>
          <button className="delete-button" type="button" aria-label="删除待办" onClick={onDelete}>
            <Trash2 size={18} />
          </button>
        </>
      )}
    </article>
  );
}

export default App;
