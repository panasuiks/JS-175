const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { body, validationResult } = require("express-validator");

const TodoList = require("./todolist");

const app = express();
const host = 'localhost';
const port = 3000;

let todoLists = require("./seed-data");

app.set("views", "./views");
app.set("view engine", "pug");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(morgan("common"));
app.use(session({
  name: "launch-school-todos-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "this is not very secure"
}))
app.use(flash());

app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  console.log(res.locals.flash);
  next();
});


app.get("/", (req, res) => {
  res.redirect("/lists");
})

app.get("/lists", (req, res) => {
  res.render("lists", {
    todoLists: sortToDoLists(todoLists),
  });
})

app.get("/lists/new", (req, res) => {
  res.render("new-list")
})

app.get("/lists/:todoListID", (req, res, next) => {
  let todoListID = req.params.todoListID;
  let todoList = loadTodoListByID(+todoListID);
  if (todoList === undefined) {
    next(new Error("not found"));
  } else {
    res.render("list", {
      todos: sortTodos(todoList.todos),
      todoList
    })
  }
});

app.post("/lists", [
  body("todoListTitle")
    .trim()
    .isLength({ min: 1 })
    .withMessage("A title was not provided")
    .bail()
    .isLength({ max: 100 })
    .withMessage("List title must be between 1 and 100 characters")
    .custom(title => {
      return !todoLists.some(todoList => todoList.title === title)
    })
    .withMessage("List title must be unique")
],

  (req, res) => {
    let title = req.body.todoListTitle;
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.render("new-list", {
        todoListTitle: title,
        flash: req.flash()
      })
    } else {
      todoLists.push(new TodoList(title));
      req.flash("success", "The todo list has been created.");
      res.redirect("/lists");
    }

  });
app.use((err, req, res, next) => {
  console.log(err);
  res.status(404).send(err.message);
})

app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}`);
})

function loadTodoListByID(id) {
  return todoLists.find(todoList => todoList.id === id)
}

function sortToDoLists(lists) {
  let finished = lists.filter(list => list.isDone())
  let unfinished = lists.filter(list => !list.isDone())

  finished.sort(compareByTitle);
  unfinished.sort(compareByTitle);

  return [...unfinished, ...finished]
}
function sortTodos(todoList) {
  let finished = todoList.filter(todo => todo.isDone())
  let unfinished = todoList.filter(todo => !todo.isDone())

  finished.sort(compareByTitle);
  unfinished.sort(compareByTitle);

  return [...unfinished, ...finished]
}


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