/* JARVIS orb refinement — call after the orb's particles have been created.
   Each particle becomes brighter and glows more strongly as it sits closer to the orb core. */
window.applyJarvisOrbCoreBrightness = function (orbElement) {
  if (!orbElement) return;
  var particles = orbElement.querySelectorAll(".particle");
  var orbRect = orbElement.getBoundingClientRect();
  var cx = orbRect.width / 2;
  var cy = orbRect.height / 2;
  var maxDistance = Math.min(orbRect.width, orbRect.height) * 0.5;

  particles.forEach(function (particle) {
    var rect = particle.getBoundingClientRect();
    var px = rect.left - orbRect.left + rect.width / 2;
    var py = rect.top - orbRect.top + rect.height / 2;
    var distance = Math.hypot(px - cx, py - cy);
    var proximity = Math.max(0, Math.min(1, 1 - distance / maxDistance));
    particle.style.setProperty("--core-proximity", proximity.toFixed(3));
  });
};
