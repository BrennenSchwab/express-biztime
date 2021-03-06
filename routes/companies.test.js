process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../app");
const db = require("../db");

let testCompany;
let testInvoice;

beforeEach(async function () {
    let companyResults = await db.query(
        `INSERT INTO 
        companies (code, name, description)
        VALUES ('apple', 'Apple', 'Maker of OSX.'),
        ('ibm', 'IBM', 'Big blue.') RETURNING code, name`);// removed description part due to issues
    testCompany = companyResults.rows;

    let invoicesResults = await db.query(
        `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
        VALUES ('apple', 100, false, '2022-02-17', null),
            ('apple', 200, false, '2022-02-17', null),
            ('apple', 300, true, '2022-02-17', '2018-01-01'),
            ('ibm', 400, false, '2022-02-17', null)
            RETURNING id`);
    
    testInvoice = invoicesResults.rows;
    })

afterEach(async function () {
    await db.query("DELETE FROM invoices");
    await db.query("DELETE FROM companies");
    await db.query("SELECT setval('invoices_id_seq', 1, false)");
    })

afterAll(async function () {
        await db.end();
    })

describe("GET /", function () {
        test("It should respond with an array of companies in the db", async function () {
                const response = await request(app).get("/companies");
                expect(response.statusCode).toEqual(200);
                expect(response.body).toEqual({
                    "companies": testCompany
                });
            });
    });

describe("GET /:code", function () {

        test("Should return info on 'code' (requested) company.", async function () {
                const response = await request(app).get(`/companies/${testCompany[0].code}`);
                expect(response.statusCode).toEqual(200);
                expect(response.body).toEqual(
                    {
                        "company": {
                            code: testCompany[0].code,
                            name: testCompany[0].name,
                            description: 'Maker of OSX.',
                            "invoices": [testInvoice[0].id, testInvoice[1].id, testInvoice[2].id]
                        }
                    }
                );
            });

        test("It should return 404 for error on no company found", async function () {
                const response = await request(app).get("/companies/non-company-pdpd");
                expect(response.status).toEqual(404);
            });
    });


describe("POST /", function () {

        test("Result should add a new company", async function () {
                const response = await request(app)
                    .post("/companies")
                    .send({ name: "Springboard", description: "Coding" });

                expect(response.statusCode).toEqual(201);
                expect(response.body).toEqual(
                    {
                        "company": {
                            code: "springboard",
                            name: "Springboard",
                            description: "Coding",
                        }
                    }
                );
            });

        test("It should return an error status code 500 for duplicates", async function () {
                const response = await request(app)
                    .post("/companies")
                    .send({ name: "Apple", description: "cjndvns" });

                expect(response.status).toEqual(500);
            });
    });


describe("PUT /:code", function () {

        test("It should update a specified company", async function () {
            const response = await request(app)
                .put(`/companies/${testCompany[0].code}`)
                .send({ name: "Apple", description: "This is a description" });

            expect(response.body).toEqual(
                {
                    "company": {
                        code: testCompany[0].code,
                        name: testCompany[0].name,
                        description: "This is a description",
                    }
                }
            );
        });

        test("It should return 404 for no company found", async function () {
                const response = await request(app)
                    .put("/companies/what")
                    .send({ name: "What" });

                expect(response.status).toEqual(404);
            });

        test("It should return 500 for missing data", async function () {
                const response = await request(app)
                    .put(`/companies/${testCompany[0].code}`)
                    .send({});

                expect(response.status).toEqual(500);
            });
    });


describe("DELETE /:code", function () {

        test("It should delete company", async function () {
            const response = await request(app)
                .delete(`/companies/${testCompany[0].code}`);

            expect(response.body).toEqual({ "status": "deleted" });
        });

        test("It should return 404 for a not-found company", async function () {
                const response = await request(app)
                    .delete("/companies/whomssss");

                expect(response.status).toEqual(404);
            });
    });
