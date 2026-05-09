const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZmE3M2M3NTYyYjI5MzQ5ZTBjNjlhNCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc4MzY4ODI3fQ.iztJupZBb3jEszQE710HtUN033bqJZvwc0swXzjke3Y";

const formData = new FormData();
formData.append("jd", "test");
formData.append("resume_text", "test");

fetch("http://localhost:5000/api/applications/analyze", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token,
  },
  body: formData
}).then(async res => {
  console.log(res.status);
  console.log(await res.text());
});
