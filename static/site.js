document.addEventListener("DOMContentLoaded", () => {

  // Handle deleting of notifications
  (document.querySelectorAll(".bulma-notification .bulma-delete") || []).forEach(($delete) => {
    const $notification = $delete.parentNode;
    // TODO auto delete some notifications
    $delete.addEventListener("click", async () => {
      await fetch(`/api/notification/${$notification.dataset.id}`, { method: "DELETE" });
      $notification.parentNode.removeChild($notification);
    });
  });

});

async function modifyPoints(modificationType, formName) {
  const formData = new FormData(document.querySelector(`[name="${formName}"]`));

  let points = 0;
  let reason = "";
  let studentId;
  let isBulk = false;

  for (const [key, value] of formData) {
    switch (key) {
      case "point-count":
        points = value;
        break;
      case "reason":
        reason = value;
        break;
      case "student-id":
        studentId = value;
        isBulk = false;
        break;
      case "student-id-multi":
        // Accepts an unknown amount of student IDs, and removes all non-numeric characters.
        // Seperate on newlines
        // TODO would be cool to accept other inputs simultaniously
        const list = value.split("\n");
        studentId = [];

        for (let i = 0; i < list.length; i++) {
          studentId.push(list[i].trim().replace(/[^0-9]+/g, ""));
        }

        isBulk = true;
        break;
      default:
        console.warn(`Unexpected key-value pair in Form('${formName}'): key: '${key}'; value: '${value}'`);
        break;
    }
  }

  // API req time
  if (isBulk) {

  } else {
    const params = new URLSearchParams();
    params.append("action", modificationType);
    params.append("points", points);
    params.append("reason", reason);

    const res = await fetch(`/api/students/${studentId}/points?${params.toString()}`, { method: "POST" });
    
  }
}
