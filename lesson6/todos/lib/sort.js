//Returns a sorted list of Todo Lists
function sortToDoLists(lists) {
  let finished = lists.filter(list => list.isDone())
  let unfinished = lists.filter(list => !list.isDone())

  finished.sort(compareByTitle);
  unfinished.sort(compareByTitle);

  return [...unfinished, ...finished]
}

//Returns a sorted list of Todos
function sortTodos(todoList) {
  let finished = todoList.filter(todo => todo.isDone())
  let unfinished = todoList.filter(todo => !todo.isDone())

  finished.sort(compareByTitle);
  unfinished.sort(compareByTitle);

  return [...unfinished, ...finished]
}

//Compare object titles alphabetically (case-insensitive)
function compareByTitle(itemA, itemB) {
  let titleA = itemA.title.toLowerCase();
  let titleB = itemB.title.toLowerCase();
  if (titleA > titleB) {
    return 1;
  }
  else if (titleA < titleB) {
    return -1;
  }
  else {
    return 0;
  }
}

module.exports = {sortToDoLists, sortTodos}