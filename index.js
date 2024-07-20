const mysql = require("mysql2");
const express = require("express");

const app = express();

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use(express.static("public"));

const sourcedb = mysql.createConnection({
  host: process.env.MYSQL_SOURCE_SERVER,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  port: 3306,
  database: process.env.MYSQL_DATABASE,
});

const replicadb = mysql.createConnection({
  host: process.env.MYSQL_REPLICA_SERVER,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  port: 3306,
  database: process.env.MYSQL_DATABASE,
});


sourcedb.connect(function (err) {
  if (err) throw err;
  console.log("Connected to source for writes!");
});

replicadb.connect(function (err) {
  if (err) throw err;
  console.log("Connected to source for reads!");
});

//create DB
app.get("/createdb", (req, res) => {
  if (!req.query?.name) {
    res.status(400).send({
      message: 'Provide a DB name against query param "name" to create a DB',
    });
  }
  let sql = `CREATE DATABASE ${req.query.name}`;
  sourcedb.query(sql, (err, result) => {
    if (err) {
      throw err;
    }
    res.send("Database created");
  });
});

//create table
app.get("/createTable", (req, res) => {
  const sql =
    "CREATE TABLE products(id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255) NOT NULL, description VARCHAR(255), cost INT NOT NULL,  PRIMARY KEY (id))";
  sourcedb.query(sql, (err, result) => {
    if (err) {
      throw err;
    }
    res.send("Table created");
  });
});

app.get("/", (req, res, next) => {
  replicadb.query("SHOW TABLES", (err, result) => {
    if (err) {
      throw err;
    }
    if (
      result?.[0]?.[`Tables_in_${process.env.MYSQL_DATABASE}`] === "products"
    ) {
      next();
    } else {
      res
        .status(400)
        .send(
          "Create Table 'products' by hitting `/createTable` before making any CRUD calls"
        );
    }
  });
});

//add products
app.get("/add", (req, res) => {
  const query = req.query;
  if (!query.name || !query.cost) {
    res.status(400).send({
      message: "Provide a product name and cost in query params",
    });
  }
  const sql = `INSERT INTO products(name, description, cost) VALUES (?, ?, ?)`;

  sourcedb.query(
    sql,
    [query.name, query?.description ?? "", query.cost],
    (err, result) => {
      if (err) {
        throw err;
      }
      res.send("Product created");
    }
  );
});

//get products
app.get("/get", (req, res) => {
  const query = req.query;
  if (query.id) {
    const sql = "SELECT * FROM products WHERE id = ?";
    replicadb.query(sql, [query.id], (err, result) => {
      if (err) {
        throw err;
      }
      res.send(result.length > 0 ? result[0] : "Product Not found");
    });
  } else {
    const sql = "SELECT * FROM products";
    replicadb.query(sql, (err, result) => {
      if (err) {
        throw err;
      }
      res.send(result);
    });
  }
});

//update products
app.get("/update", (req, res) => {
  const { id, name, description, cost } = req.query;
  if (!id) {
    res
      .status(400)
      .send(
        "Provide the id of product to update along with property to update"
      );
  } else if (!name && !description && !cost) {
    res.status(400).send("Provide atleast 1 property to update");
  } else {
    const updateList = [
      name ? "name = ?" : "",
      description ? "description = ?" : "",
      cost ? "cost = ?" : "",
    ]
      .filter((str) => !!str)
      .join(",");

    const sql = `UPDATE products SET ${updateList} WHERE id = ?`;

    const params = [name, description, Number(cost), Number(id)].filter(
      (val) => !!val
    );

    sourcedb.query(sql, params, (err, result) => {
      if (err) {
        throw err;
      }
      res.send(
        result.affectedRows === 1 ? "Product updated!" : "Product Not found"
      );
    });
  }
});

app.get("/delete", (req, res) => {
  const { id } = req.query;
  if (!id) {
    res.status(400).send("Provide the id of product to delete");
  } else {
    sourcedb.query("DELETE FROM products WHERE id = ?", [id], (err, result) => {
      if (err) {
        throw err;
      }
      res.send(
        result.affectedRows === 1 ? "Product deleted!" : "Product Not found"
      );
    });
  }
});

app.get("/", (req, res) => {
  res.render("index");
});

app.listen(process.env.PORT ?? 3000, () =>
  console.log(`Server listening on ${process.env.PORT ?? 3000}`)
);
