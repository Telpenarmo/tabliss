import { reducer } from './reducer';
import { removeTodo, toggleTodo, updateTodo } from './actions';
import { Todo } from './types';

const defFunc = (...args: any[]) => { };

function dummyTodo(id: string, contents: string, completed: boolean, complete = defFunc, edit = defFunc, remove = defFunc): Todo {
  return {
    id,
    contents,
    completed,
    complete,
    edit,
    remove,
  }
}

describe('todo/reducer', () => {
  it('should remove todo', () => {
    expect(
      reducer(
        [
          dummyTodo('1234', 'Existing todo', true),
        ],
        removeTodo('1234'),
      ),
    ).toEqual([]);

    expect(
      reducer(
        [
          dummyTodo('1234', 'Existing todo', true),
          dummyTodo('5678', 'Second existing todo', false),
        ],
        removeTodo('1234'),
      ),
    ).toEqual([
      dummyTodo('5678', 'Second existing todo', false),
    ]);
  });

  it('should toggle todo', () => {
    expect(
      reducer(
        [
          dummyTodo('1234', 'Existing todo', true),
          dummyTodo('5678', 'Second existing todo', false),
        ],
        toggleTodo('1234'),
      ),
    ).toEqual([
      dummyTodo('1234', 'Existing todo', false),
      dummyTodo('5678', 'Second existing todo', false),
    ]);

    expect(
      reducer(
        [
          dummyTodo('1234', 'Existing todo', true),
          dummyTodo('5678', 'Second existing todo', false),
        ],
        toggleTodo('5678'),
      ),
    ).toEqual([
      dummyTodo('1234', 'Existing todo', true),
      dummyTodo('5678', 'Second existing todo', true),
    ]);
  });

  it('should update todo', () => {
    expect(
      reducer(
        [
          dummyTodo('1234', 'Existing todo', true),
          dummyTodo('5678', 'Second existing todo', false),
        ],
        updateTodo('1234', 'Existing todo: edited'),
      ),
    ).toEqual([
      dummyTodo('1234', 'Existing todo: edited', true),
      dummyTodo('5678', 'Second existing todo', false),
    ]);
  });

  it('should delete on empty update', () => {
    expect(
      reducer(
        [
          dummyTodo('1234', 'Existing todo', true),
          dummyTodo('5678', 'Second existing todo', false),
        ],
        updateTodo('5678', ''),
      ),
    ).toEqual([
      dummyTodo('1234', 'Existing todo', true),
    ]);
  });

  it('should call remove', () => {
    const todo = dummyTodo('1234', 'Existing todo', true, jest.fn(), jest.fn(), jest.fn());
    reducer([todo], removeTodo('1234'));
    expect(todo.remove).toBeCalled()
  });

  it('should call complete', () => {
    const todo = dummyTodo('1234', 'Existing todo', true, jest.fn(), jest.fn(), jest.fn());
    reducer([todo], toggleTodo('1234'));
    expect(todo.complete).toBeCalled();
  });

  it('should call edit', () => {
    const todo = dummyTodo('1234', 'Existing todo', true, jest.fn(), jest.fn(), jest.fn());
    reducer([todo], updateTodo('1234', 'Existing todo: edited'));
    expect(todo.edit).toBeCalledWith('Existing todo: edited');
  });

  it('should call remove on empty update', () => {
    const todo = dummyTodo('1234', 'Existing todo', true, jest.fn(), jest.fn(), jest.fn());
    reducer([todo], updateTodo('1234', ''));
    expect(todo.remove).toBeCalled()
  });

  it('should throw on unknown action', () => {
    expect(() => reducer([], { type: 'UNKNOWN' } as any)).toThrow();
  });
});
