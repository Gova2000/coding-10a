const express = require("express");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const path = require("path");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pathFix = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const initialize = async () => {
  try {
    db = await open({
      filename: pathFix,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB ERROR ${e.message}`);
    process.exit(-1);
  }
};

initialize();
const logger = (request, response, next) => {
  console.log(request.query);
  next();
};

const authenticate = (request, response, next) => {
  let jeToken;
  const aHeader = request.header["authorization"];
  if (aHeader !== undefined) {
    jeToken = aHeader.split(" ")[1];
  }
  if (jeToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jeToken, "jhjkjjj", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        response.send({ jeToken });
        next();
      }
    });
  }
};

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT *
   FROM 
   user
    WHERE 
    username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (username === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isMatch = await bcrypt.compare(password, dbUser.password);
    if (isMatch === true) {
      const payload = { username: username };
      const JToken = jwt.sign(payload, "jhjkjjj");

      response.send({ JToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//get all states
app.get("/states/",async (request, response) => {
  const getStates = `
    SELECT
    *
    FROM
    state;`;
  const AllStates = await db.all(getStates);
  response.send(AllStates.map((each) => Convert(each)));
});

//get states based on ID
const Convert = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getState = `
    SELECT
    *
    FROM
    state
    WHERE 
    state_id=${stateId};`;
  const Stat = await db.get(getState);
  response.send(Convert(Stat));
});

//create a district in dist table
app.post("/districts/", async (request, response) => {
  const req = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = req;
  const CreateDist = `
  INSERT INTO
  district (district_name,state_id,cases,cured,active,deaths)
  VALUES 
  ('${districtName}',
  ${stateId},
  ${cases},
  ${cured},
  ${active},
  ${deaths});
  `;
  await db.run(CreateDist);
  response.send("District Successfully Added");
});

//get dist based on ID

const Con = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDist = `
    SELECT
    *
    FROM
    district
    WHERE 
    district_id=${districtId};`;
  const Dist = await db.get(getDist);
  response.send(Con(Dist));
});

//updates dist details based on ID
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const req = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = req;
  const updateDist = `
  UPDATE
  district
  SET
  district_name='${districtName}',
  state_id=${stateId},
  cases=${cases},
  cured=${cured},
  active=${active},
  deaths=${deaths}
  WHERE
  district_id=${districtId};
  `;
  await db.run(updateDist);
  response.send("District Details Updated");
});

//delete dist based on ID
app.delete(
  "/districts/:districtId/",
  async (request, response) => {
    const { districtId } = request.params;
    const delDist = `
  DELETE
  FROM
  district
  WHERE 
  district_id=${districtId};`;
    await db.run(delDist);
    response.send("District Removed");
  }
);

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const stateDETails = `
    SELECT 
    SUM(cases) as totalCases,
    SUM(cured) as totalCured,
    SUM(active) as totalActive,
    SUM(deaths) as totalDeaths
    FROM
    district
    WHERE 
    state_id=${stateId};
    `;
  const stateDET = await db.get(stateDETails);
  response.send(stateDET);
});

module.exports = app;
