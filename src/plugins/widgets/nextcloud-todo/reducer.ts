import { Action } from './actions';
import { State } from './types';

export function reducer(state: State, action: Action) {
  const item = state.find(todo => todo.id === action.data.id);
  switch (action.type) {

    case 'REMOVE_TODO':
      item?.remove();
      break;

    case 'TOGGLE_TODO':
      item?.complete();
      break;

    case 'UPDATE_TODO':
      (action.data.contents === '') ? item?.remove() : item?.edit(action.data.contents);
      break;

    default:
      throw new Error('Unknown action');
  }
}
