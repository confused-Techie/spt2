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
    const params = new URLSearchParams();
    params.append("action", modificationType);
    params.append("points", points);
    params.append("reason", reason);

    const totalReqs = studentId.length;
    let successfulReqs = 0;
    let failedReqs = 0;

    for (let i = 0; i < studentId.length; i++) {
      try {
        const res = await fetch(`/api/students/${studentId[i]}/points?${params.toString()}`, { method: "POST" });
        if (res.status === 200) {
          successfulReqs = successfulReqs + 1;
        } else {
          failedReqs = failedReqs + 1;
        }
      } catch(err) {
        failedReqs = failedReqs + 1;
      }
    }

    if (successfulReqs === totalReqs) {
      const notifParams = new URLSearchParams();
      notifParams.append("status", "success");
      notifParams.append("msg", "Successfully modified batch of students points.");
      const notifRes = await fetch(`/api/notifications?${notifParams.toString()}`, { method: "PATCH" });
      if (notifRes.status !== 200) {
        console.error("Error adding successful batch point modification msg to notifications");
        console.error(notifRes);
      }
    } else {
      const notifParams = new URLSearchParams();
      notifParams.append("status", "danger");
      notifParams.append("msg", `Errors occurred while adding batch of student points. Successful '${successfulReqs}', Failed '${failedReqs}'`);
      const notifRes = await fetch(`/api/notifications?${notifParams.toString()}`, { method: "PATCH" });
      if (notifRes.status !== 200) {
        console.error("Error adding failed batch point modification msg to notifications");
        console.error(notifRes);
      }
    }
  } else {
    const params = new URLSearchParams();
    params.append("action", modificationType);
    params.append("points", points);
    params.append("reason", reason);

    try {
      const res = await fetch(`/api/students/${studentId}/points?${params.toString()}`, { method: "POST" });
      if (res.status === 200) {
        // Everything succeeded, and we can add a notification indicating so
        const notifParams = new URLSearchParams();
        notifParams.append("status", "success");
        notifParams.append("msg", `Successfully modified points for student: '${studentId}'`);
        const notifRes = await fetch(`/api/notifications?${notifParams.toString()}`, { method: "PATCH" });
        if (notifRes.status !== 200) {
          console.error("Error adding successful point modification msg to notifications");
          console.error(notifRes);
        }
      } else {
        // The process failed, add a notification
        const notifParams = new URLSearchParams();
        notifParams.append("status", "danger");
        notifParams.append("msg", `Failed to modify points for student: '${studentId}'`);
        const notifRes = await fetch(`/api/notifications?${notifParams.toString()}`, { method: "PATCH" });
        if (notifRes.status !== 200) {
          console.error("Error adding failed point modification msg to notifications");
          console.error(notifRes);
        }
      }
    } catch(err) {
      const notifParams = new URLSearchParams();
      notifParams.append("status", "danger");
      notifParams.append("msg", `Failed to modify points for student: '${studentId}' due to '${err.toString()}'`);
      const notifRes = await fetch(`/api/notifications?${notifParams.toString()}`, { method: "PATCH" });
      if (notifRes.status !== 200) {
        console.error("Error adding errored point modification msg to notifications");
        console.error(notifRes);
      }
    }

  }
}
