import React, { FC } from 'react';

import { useToggle, useCachedEffect } from '../../../hooks';
import { DownIcon, Icon, UpIcon, ExpandIcon } from '../../../views/shared';
import TodoList from './TodoList';
import { defaultData, Props } from './types';
import { removeTodo, toggleTodo, updateTodo, Action } from './actions';
import { getTodos } from './api';
import { reducer } from './reducer';

const Todo: FC<Props> = ({ cache, data = defaultData, setCache, loader }) => {
  const [showCompleted, toggleShowCompleted] = useToggle();
  const [showMore, toggleShowMore] = useToggle();
  const refreshInterval = data.refreshInterval * 60 * 1000; // min -> ms

  function updateTodos() { getTodos(data, loader).then(setCache) };

  useCachedEffect(
    updateTodos,
    cache ? cache.timestamp + refreshInterval : 0,
    [data.userName, data.password, data.serverURL, data.dueTimeRange]
  );

  if (!cache) {
    return null;
  }

  const items = cache.items.filter(item => !item.completed || showCompleted);
  const show = !showMore ? data.show : undefined;

  function dispatch(f: (...args: any[]) => Action) {
    return (...args: any[]) => { reducer(items, f(...args)); updateTodos(); }
  }

  return (
    <div className="Todo">
      <TodoList
        items={items}
        onToggle={dispatch(toggleTodo)}
        onUpdate={dispatch(updateTodo)}
        onRemove={dispatch(removeTodo)}
        show={show}
      />

      <div>
        <a onClick={toggleShowCompleted}>
          <Icon name={showCompleted ? 'check-circle' : 'circle'} />
        </a>{' '}
        {items.length > data.show && (
          <a onClick={toggleShowMore}>{showMore ? <UpIcon /> : <DownIcon />}</a>
        )}
      </div>
    </div>
  );
};

export default Todo;
