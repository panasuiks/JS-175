const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const store = require("connect-loki");
const { body, validationResult } = require("express-validator");
const { sortTodos, sortToDoLists } = require("./sort");

const TodoList = require("./todolist");

const app = express();
const host = 'localhost';
const port = 3000;
const LokiStore = store(session);

const Todo = require("./todo");

app.set("views", "./views");
app.set("view engine", "pug");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(morgan("common"));
app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000,
    path: "/",
    secure: false,
  },
  name: "launch-school-todos-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "this is not very secure",
  store: new LokiStore({})
}))
app.use(flash());

app.use((req, res, next) => {
  let todoLists = [];
  if (("todoLists" in req.session)) {
    req.session.todoLists.forEach(todoList => {
      todoLists.push(TodoList.makeTodoList(todoList));
    })
  }
  req.session.todoLists = todoLists;
  next();
})

app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});


app.get("/", (req, res) => {
  res.redirect("/lists");
})

app.get("/lists", (req, res) => {
  res.render("lists", {
    todoLists: sortToDoLists(req.session.todoLists),
  });
})

app.get("/lists/new", (req, res) => {
  res.render("new-list")
})

app.get("/lists/:todoListID", (req, res, next) => {
  let todoListID = req.params.todoListID;
  let todoList = loadTodoListByID(+todoListID, req.session.todoLists);
  if (todoList === undefined) {
    next(new Error("not found"));
  } else {
    res.render("list", {
      todos: sortTodos(todoList.todos),
      todoList
    })
  }
});

app.get("/lists/:todoListID/edit", (req, res, next) => {
  let todoListID = req.params.todoListID;
  let todoList = loadTodoListByID(+todoListID, req.session.todoLists);
  if (!todoList) {
    next(new Error("not found"));
  } else {
    res.render("edit-list", {
      todoList,
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
    .custom((title, { req }) => {
      return !req.session.todoLists.some(todoList => todoList.title === title)
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
      req.session.todoLists.push(new TodoList(title));
      req.flash("success", "The todo list has been created.");
      res.redirect("/lists");
    }

  });

app.post("/lists/:todoListID/todos/:todoID/toggle", (req, res, next) => {
  let { todoListID, todoID } = { ...req.params };
  let todo = loadTodoByID(+todoListID, +todoID, req.session.todoLists);
  if (todo === undefined) {
    next(new Error("not found"));
  } else {
    toggleTodo(todo, todoListID);
    req.flash("success", `${todo.title} has been toggled.`);
    res.redirect(`/lists/${todoListID}`);
  }
});

app.post("/lists/:todoListID/todos/:todoID/destroy", (req, res, next) => {
  let { todoListID, todoID } = { ...req.params };
  let todoList = loadTodoListByID(+todoListID, req.session.todoLists);
  let todo = loadTodoByID(+todoListID, +todoID);
  if (todo === undefined) {
    next(new Error("not found"));
  } else {
    deleteTodo(todo, todoList);
    req.flash("success", `${todo.title} has been deleted.`);
    if (todoList.size() === 0) {
      res.redirect('/lists');
    } else {
      res.redirect(`/lists/${todoListID}`);
    }
  }
})

app.post("/lists/:todoListID/complete_all", (req, res, next) => {
  let todoListID = req.params.todoListID;
  let todoList = loadTodoListByID(+todoListID, req.session.todoLists)
  if (todoList === undefined) {
    next(new Error("not found"));
  } else {
    todoList.markAllDone()
    req.flash("success", `${todoList.title} had been marked complete.`)
    res.redirect(`/lists/${todoListID}`);
  }
});

app.post("/lists/:todoListID/todos", [
  body("todoTitle")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Todo title was not provided")
    .bail()
    .isLength({ max: 100 })
    .withMessage("Todo title must be between 1 and 100 characters")
],
  (req, res, next) => {
    let todoListID = req.params.todoListID;
    let todoList = req.session.todoLists.find(todoList => todoList.id == todoListID);

    if (todoList === undefined) {
      next(new Error("not found"));
    } else {
      let errors = validationResult(req);
      let todoTitle = req.body.todoTitle;
      if (!errors.isEmpty()) {
        errors.array().forEach(error => {
          req.flash("error", error.msg);
        });
        res.render("list", {
          flash: req.flash(),
          todoList,
          todos: sortTodos(todoList.todos),
          todoTitle
        });
      } else {
        todoList.add(new Todo((todoTitle)));
        req.flash("succes", "Todo added!");
        res.redirect(`/lists/${todoListID}`);
      }
    }
  });

app.post("/lists/:todoListID/destroy", (req, res, next) => {
  let todoListID = req.params.todoListID;
  let todoList = loadTodoListByID(+todoListID, req.session.todoLists);
  if (!todoList) {
    next(new Error("not found"));
  } else {
    let index = req.session.todoLists.indexOf(todoList)
    req.session.todoLists.splice(index, 1);
    req.flash("success", `${todoList.title} deleted`);
    res.redirect("/lists");
  }
})

app.post("/lists/:todoListID", [
  body("todoListTitle")
    .trim()
    .isLength({ min: 1 })
    .withMessage("Todo title was not provided")
    .bail()
    .isLength({ max: 100 })
    .withMessage("Todo title must be between 1 and 100 characters")
    .bail()
    .custom((todoListTitle, {req}) => {
      let duplicate = req.session.todoLists.find(todoList => todoList.title === todoListTitle)
      return duplicate === undefined;
    })
    .withMessage("Todo list title must be unique.")
], (req, res, next) => {
  let todoListID = req.params.todoListID;
  let todoList = loadTodoListByID(+todoListID, req.session.todoLists);
  if (todoList === undefined) {
    next(new Error("not found"));
  } else {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(error => req.flash("error", error.msg));
      res.render("edit-list", {
        todoList,
        flash: req.flash()
      })
    } else {
      let newTitle = req.body.todoListTitle
      let oldTitle = todoList.title;
      todoList.setTitle(newTitle)
      req.flash("succes", `Changed title from ${oldTitle} to ${newTitle}`)
      res.redirect(`/lists/${todoListID}`)
    }
  }
})

app.use((err, req, res, next) => {
  console.log(err);
  res.status(404).send(err.message);
})

app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}`);
})

function loadTodoListByID(id, todoLists) {
  return todoLists.find(todoList => todoList.id === id)
}

function loadTodoByID(todoListID, todoID, todoLists) {
  let todoList = loadTodoListByID(+todoListID, todoLists);
  if (todoList === undefined) {
    return undefined;
  } else {
    return todoList.todos.find(todo => todo.id === todoID);
  }
}

function toggleTodo(todo) {
  if (todo.isDone()) {
    todo.markUndone();
  } else {
    todo.markDone();
  }
}

function deleteTodo(todo, todoList) {
  let index = todoList.findIndexOf(todo);
  todoList.removeAt(index);
}