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

  })

app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}`);
})

function sortToDoLists(lists) {
  let finished = lists.filter(list => list.isDone())
  let unfinished = lists.filter(list => !list.isDone())

  finished.sort(compareByTitle);
  unfinished.sort(compareByTitle);

  return [...unfinished, ...finished]
}

function compareByTitle(todoListA, todoListB) {
  let titleA = todoListA.title.toLowerCase();
  let titleB = todoListB.title.toLowerCase();
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