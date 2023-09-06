import { Config } from "../../types";
import Todo from "./Todo";
import TodoSettings from "./TodoSettings";

const config: Config = {
  key: "widget/caldav-todo",
  name: "Todos from CalDAV server",
  description: "Add reminders to procrastinate, and sync them.",
  dashboardComponent: Todo,
  settingsComponent: TodoSettings,
};

export default config;
