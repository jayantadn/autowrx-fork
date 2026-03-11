/**
 * Widget Syncer - Communication helper for dashboard widgets.
 * Handles postMessage communication with the parent dashboard.
 */

(function () {
  const apiMap = new Map();
  let vssTree = null;
  let widgetOptions = {};
  let appLog = '';

  /**
   * Get the current value of a vehicle API signal.
   * @param {string} apiName - The API signal name (e.g., 'Vehicle.Speed')
   * @returns {*} The current value or undefined
   */
  window.getApiValue = function (apiName) {
    return apiMap.get(apiName);
  };

  /**
   * Get all current API values.
   * @returns {Object} Map of all API values
   */
  window.getAllApiValues = function () {
    return Object.fromEntries(apiMap);
  };

  /**
   * Set a vehicle API value (notify parent to update simulation).
   * @param {string} apiName - The API signal name
   * @param {*} value - The value to set
   */
  window.setApiValue = function (apiName, value) {
    parent.postMessage(
      JSON.stringify({
        cmd: 'set-api-value',
        api: apiName,
        value: value,
      }),
      '*'
    );
  };

  /**
   * Get the VSS tree structure.
   * @returns {Object|null} The VSS tree
   */
  window.getVssTree = function () {
    return vssTree;
  };

  /**
   * Get widget options passed from configuration.
   * @returns {Object} Widget options
   */
  window.getWidgetOptions = function () {
    return widgetOptions;
  };

  /**
   * Get the current app log output.
   * @returns {string} The app log
   */
  window.getAppLog = function () {
    return appLog;
  };

  /**
   * Open a modal in the parent dashboard.
   * @param {Object} payload - Modal payload (type: 'video'|'image'|'iframe', url/html, options)
   */
  window.openModal = function (payload) {
    parent.postMessage(
      JSON.stringify({
        action: 'open-modal',
        payload: payload,
      }),
      '*'
    );
  };

  window.addEventListener('message', function (e) {
    let payload;
    try {
      payload = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    } catch (err) {
      return;
    }

    switch (payload.cmd) {
      case 'widget-options':
        widgetOptions = payload.options || {};
        if (typeof window.onWidgetLoaded === 'function') {
          window.onWidgetLoaded(widgetOptions);
        }
        break;

      case 'vss-sync':
        const data = payload.vssData || {};
        for (const key in data) {
          apiMap.set(key, data[key]);
        }
        if (typeof window.onVssSync === 'function') {
          window.onVssSync(data);
        }
        break;

      case 'vss-tree':
        vssTree = payload.vssTree || null;
        if (typeof window.onVssTree === 'function') {
          window.onVssTree(vssTree);
        }
        break;

      case 'app-log':
        appLog = payload.log || '';
        if (typeof window.onAppLog === 'function') {
          window.onAppLog(appLog);
        }
        break;
    }
  });

  // Notify parent that widget is ready
  parent.postMessage(JSON.stringify({ cmd: 'widget-ready' }), '*');
})();
