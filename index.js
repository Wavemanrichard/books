import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";

const port = 3000;
const app = express();

//middleware
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

//creates a connection to the postgres db using credentials provided
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "books",
  password: "Drogba11",
  port: 5432,
});

//connects to the database
db.connect();

process.on("SIGINT", async () => {
  await db.end();
  process.exit();
});

// receives data via parameters and api then adds the data to the database
async function addToDb(getISBN, getTitle, getWhy, getInterest) {
  try {
    const date = new Date();
    const getDate = date.toISOString();

    const response = await axios.get(
      `https://covers.openlibrary.org/b/isbn/${getISBN}-M.jpg`,
      { responseType: "arraybuffer" }
    );

    const getCover = Buffer.from(response.data, "binary");
    const result = await db.query(
      "INSERT INTO books_to_read (isbn, title, why, interest, date_added, cover) VALUES ($1, $2, $3, $4, $5, $6);",
      [getISBN, getTitle, getWhy, getInterest, getDate, getCover]
    );
  } catch (err) {
    console.log("Didn't capture book cover image");
    await db.query(
      "INSERT INTO books_to_read (isbn, title, why, interest, date_added, cover) VALUES ($1, $2, $3, $4, $5, NULL);",
      [getISBN, getTitle, getWhy, getInterest, getDate]
    );
  }
}

//renders index.ejs page with the info form the table in db via list
app.get("/", async (req, res) => {
  let list = await db.query("SELECT * FROM books_to_read; ");
  res.render("index.ejs", {
    books: list.rows,
  });
});

//allows user to add a new book that they'd like to read
app.post("/add", async (req, res) => {
  const getISBN = req.body.isbn;
  const getTitle = req.body.title;
  const getWhy = req.body.why;
  const getInterest = req.body.interest;

  await addToDb(getISBN, getTitle, getWhy, getInterest);

  res.redirect("/");
});

//filters and orders the information seen based on the choice then rerenders the page
app.post("/filter", async (req, res) => {
  let choice = req.body.filter;
  let query;

  switch (choice) {
    case "default":
      query = "SELECT * FROM books_to_read ORDER BY title ASC;";
      break;

    case "ratingUp":
      query = "SELECT * FROM books_to_read ORDER BY interest ASC;";
      break;

    case "ratingDown":
      query = "SELECT * FROM books_to_read ORDER BY interest DESC;";
      break;

    case "recent":
      query = "SELECT * FROM books_to_read ORDER BY date_added DESC;";
      break;

    case "older":
      query = "SELECT * FROM books_to_read ORDER BY date_added ASC;";
      break;

    default:
      break;
  }

  const list = await db.query(query);

  res.render("index.ejs", { books: list.rows });
});

//listens for server
app.listen(port, () => {
  console.log(`Server ${port} is running.`);
});
