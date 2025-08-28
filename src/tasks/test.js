
module.exports = async function main(server, taskId) {
  // Task actions can go in here

  // As a test lets add some DB data
  await server.database.addStudent({
    student_id: 1,
    first_name: "John",
    last_name: "Smith"
  });

  await server.database.addStudent({
    student_id: 2,
    first_name: "Jane",
    last_name: "Smith"
  });

  await server.database.addPointsToStudent(1, 30, "Awesome Behavior");
  await server.database.addPointsToStudent(1, 10, "Good Behavior");
  await server.database.removePointsFromStudent(1, 2, "Bad Behavior");
};
