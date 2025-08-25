document.addEventListener("DOMContentLoaded", () => {

  (document.querySelectorAll(".bulma-notification .bulma-delete") || []).forEach(($delete) => {
    const $notification = $delete.parentNode;
    $delete.addEventListener("click", async () => {
      await fetch(`/api/notification/${$notification.dataset.id}`, { method: "DELETE" });
      $notification.parentNode.removeChild($notification);
    });
  });
});
