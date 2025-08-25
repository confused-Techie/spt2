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
