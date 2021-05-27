import React, { FC } from 'react';

import { useSavedReducer, useToggle, useCachedEffect } from '../../../hooks';
import { DownIcon, Icon, UpIcon, ExpandIcon } from '../../../views/shared';
// import { removeTodo, toggleTodo, updateTodo } from './actions';
// import { reducer } from './reducer';
import TodoList from './TodoList';
import { defaultData, Props, State } from './types';
import { getTodos } from './api';

const Todo: FC<Props> = ({ cache, data = defaultData, setCache, loader }) => {
  const [showCompleted, toggleShowCompleted] = useToggle();
  const [showMore, toggleShowMore] = useToggle();
  const refreshInterval = data.refreshInterval * 60 * 1000; // min -> ms

  useCachedEffect(
    () => { getTodos(data, loader).then(setCache) },
    cache ? cache.timestamp + refreshInterval : 0,
    []
  );

  if (!cache) {
    return null;
  }

  // const setItems = (todos: State) => setCache({ items: todos, timestamp: Date.now() });
  // const dispatch = useSavedReducer(reducer, data.items, setItems);

  const items = cache.items.filter(item => !item.completed || showCompleted);
  const show = !showMore ? data.show : undefined;

  return (
    <div className="Todo">
      <TodoList
        items={items}
        // onToggle={(...args) => dispatch(toggleTodo(...args))}
        // onUpdate={(...args) => dispatch(updateTodo(...args))}
        // onRemove={(...args) => dispatch(removeTodo(...args))}
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
