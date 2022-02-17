process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../app");
const db = require("../db");

let testCompany;
let testInvoice;

beforeEach(async function () {
        const companyResults = await db.query(
            `INSERT INTO companies (code, name, description)
        VALUES ('apple', 'Apple Computer', 'Maker of OSX.'),
            ('ibm', 'IBM', 'Big blue.') RETURNING code, name, description`);

        testCompany = companyResults.rows;

        const invoicesResults = await db.query(
            `INSERT INTO invoices (comp_code, amt, paid, add_date, paid_date)
        VALUES ('apple', 100, false, '2022-02-17', null),
            ('apple', 200, false, '2022-02-17', null),
            ('apple', 300, true, '2022-02-17', '2018-01-01'), 
            ('ibm', 400, false, '2022-02-17', null)
            RETURNING *`);

        testInvoice = invoicesResults.rows;
    }); 

afterEach(async function() {
    await db.query("DELETE FROM invoices");
    await db.query("DELETE FROM companies");
    await db.query("SELECT setval('invoices_id_seq', 1, false)");
})

afterAll(async function() {
  await db.end()
})

describe("GET /", function() {
        test("It should respond with array of invoices", async function() {
                const response = await request(app).get("/invoices");
                expect(response.statusCode).toEqual(200);
                expect(response.body).toEqual({
                    "invoices": [
                        { id: 1, comp_code: testCompany[0].code },
                        { id: 2, comp_code: testCompany[0].code },
                        { id: 3, comp_code: testCompany[0].code },
                        { id: 4, comp_code: testCompany[1].code },
                    ]
                });
            });

    });


describe("GET /:id", function() {

        test("Should return specific invoice info", async function() {
            const response = await request(app).get(`/invoices/${testInvoice[0].id}`);
            expect(response.statusCode).toEqual(200);
            expect(response.body).toEqual(
                {
                    "invoice": {
                        id: testInvoice[0].id,
                        amt: testInvoice[0].amt,
                        add_date: `${testInvoice[0].add_date}`,
                        paid: testInvoice[0].paid,
                        paid_date: testInvoice[0].paid_date,
                        "company": {
                            code: testCompany[0].code,
                            name: testCompany[0].name,
                            description: testCompany[0].description,
                        }
                    }
                }
            );
        });

        test("It should return 404 for no-such-invoice", async function() {
                const response = await request(app).get("/invoices/999");
                expect(response.status).toEqual(404);
            });
    });


describe("POST /", function() {

        test("It should add a new invoice for a company", async function() {
                const response = await request(app)
                    .post("/invoices")
                    .send({ amt: 500, comp_code: 'ibm' });

                expect(response.body).toEqual(
                    {
                        "invoice": {
                            id: 5,
                            comp_code: "ibm",
                            amt: 500,
                            add_date: expect.any(String),
                            paid: false,
                            paid_date: null,
                        }
                    }
                );
            });
    });


describe("PUT /", function() {

        test("It should update an invoice", async function() {
                const response = await request(app)
                    .put(`/invoices/${testInvoice[0].id}`)
                    .send({ amt: 1000, paid: false });

                expect(response.body).toEqual(
                    {
                        "invoice": {
                            id: testInvoice[0].id,
                            comp_code: testInvoice[0].comp_code,
                            paid: testInvoice[0].paid,
                            amt: 1000,
                            add_date: expect.any(String),
                            paid_date: testInvoice[0].paid_date,
                        }
                    }
                );
            });

        test("It should return 404 for no-such-invoice", async function() {
                const response = await request(app)
                    .put("/invoices/9999")
                    .send({ amt: 1000 });

                expect(response.status).toEqual(404);
            });

        test("It should return 500 for missing data", async function() {
                const response = await request(app)
                    .put(`/invoices/${testInvoice[0]}`)
                    .send({});

                expect(response.status).toEqual(500);
            });
    });


describe("DELETE /", function() {

        test("It should delete invoice", async function() {
                const response = await request(app)
                    .delete(`/invoices/${testInvoice[0].id}`);

                expect(response.body).toEqual({ "status": "deleted" });
            });

        test("It should return 404 for no-such-invoices", async function() {
                const response = await request(app)
                    .delete("/invoices/999");

                expect(response.status).toEqual(404);
            });
    });
