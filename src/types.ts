export type ListColor = "#0a84ff" | "#34c759" | "#ff9500" | "#ff2d55" | "#af52de" | "#5ac8fa";

export type TodoList = {
  id: string;
  family_id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: string;
};

export type Todo = {
  id: string;
  family_id: string;
  list_id: string | null;
  title: string;
  notes: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type SmartView = "today" | "upcoming" | "all" | "completed";

export type View =
  | {
      type: "smart";
      id: SmartView;
      title: string;
    }
  | {
      type: "list";
      id: string;
      title: string;
    };
