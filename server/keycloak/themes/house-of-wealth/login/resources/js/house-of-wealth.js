// Password show/hide toggle only — purely a display convenience, the real
// <input name="password"> and form submission to Keycloak are untouched.
(function () {
  function init() {
    var toggle = document.getElementById('toggle-password');
    var password = document.getElementById('password');
    if (!toggle || !password) return;

    toggle.addEventListener('click', function () {
      var isVisible = password.type === 'text';
      password.type = isVisible ? 'password' : 'text';
      toggle.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
