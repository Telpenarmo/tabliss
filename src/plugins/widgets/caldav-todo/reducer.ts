import { Action } from "./actions";
import { State, Todo } from "./types";

export function reducer(state: State, action: Action): State {
  const item = state.find((todo) => todo.id === action.data.id);
  function remove() {
    item?.remove();
    return state.filter((todo) => todo.id !== action.data.id);
  }
  function replace(f: (item: Todo) => Todo) {
    return state.map((todo) => (todo.id === action.data.id ? f(todo) : todo));
  }
  switch (action.type) {
    case "REMOVE_TODO":
      return remove();

    case "TOGGLE_TODO":
      item?.complete();
      return replace((todo) => {
        return { ...todo, completed: !todo.completed };
      });

    case "UPDATE_TODO":
      if (action.data.contents === "") {
        return remove();
      }

      item?.edit(action.data.contents);
      return replace((todo) => {
        return { ...todo, contents: action.data.contents };
      });

    default:
      throw new Error("Unknown action");
  }
}
