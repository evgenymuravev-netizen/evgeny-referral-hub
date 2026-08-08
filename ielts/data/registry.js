/* Test registry. Loaded before the individual test data files so each of them
   can call IELTSData.add(...) / IELTSData.part(...) at parse time.
   Plain <script> files (not fetch/JSON) so the app also works from file://. */
(function (w) {
  var tests = {};
  var order = [];

  w.IELTSData = {
    tests: tests,
    order: order,

    /* Create or fetch the shell for a test. */
    test: function (id, meta) {
      if (!tests[id]) {
        tests[id] = {
          id: id,
          name: '',
          blurb: '',
          listening: null,
          readingAcademic: null,
          readingGeneral: null,
          writingAcademic: null,
          writingGeneral: null,
          speaking: null
        };
        order.push(id);
      }
      if (meta) {
        for (var k in meta) if (Object.prototype.hasOwnProperty.call(meta, k)) tests[id][k] = meta[k];
      }
      return tests[id];
    },

    /* Attach one skill section to a test. */
    add: function (id, skill, payload) {
      var t = this.test(id);
      t[skill] = payload;
      return t;
    },

    list: function () {
      return order.map(function (id) { return tests[id]; });
    },

    get: function (id) { return tests[id] || null; }
  };
})(window);
