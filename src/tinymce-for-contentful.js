window.contentfulExtension.init(function(api) {
  function setupCtfRefPlugin(editor, url) {
    editor.addCommand('mceInsertCtfRef', function () {
      const selectEntryReference = editor.getParam('ctf_select_ref_dialog', async () => {});
      const locale = api.field.locale;
      const contentTypes = editor.getParam('ctf_content_types');
      selectEntryReference({ locale, contentTypes }).then((entry) => {
        if (!entry) {
          return;
        }
        const entryId = entry.sys.id;
        let title = 'placeholder';
        for (let titleProp of editor.getParam('ctf_title_prop', [])) {
          if (entry.fields[titleProp]) {
          title = entry.fields[titleProp][locale];
            break;
          }
        }
        if (title === 'placeholder') {
          console.log('Title prop not found:', entry.fields);
        }
        const html = `<a class="mce-nbsp-wrap" contenteditable="false" href="#${entryId}" data-ctf-id="${entryId}">${title}</a>`;
        editor.undoManager.transact(function () {
          return editor.insertContent(html);
        });
      });
    });

    editor.ui.registry.addButton('ctfref', {
      text: 'Insert CTF entry',
      onAction: () => editor.execCommand('mceInsertCtfRef')
    });
    editor.ui.registry.addMenuItem('ctfref', {
      icon: 'bookmark',
      text: 'Insert CTF entry',
      onAction: () => editor.execCommand('mceInsertCtfRef')
    });
  };

  function tinymceForContentful(api) {
    function tweak(param) {
      var t = param.trim();
      if (t === "false") {
        return false;
      } else if (t === "") {
        return undefined;
      } else {
        return t;
      }
    }

    var p = tweak(api.parameters.instance.plugins);
    var tb = tweak(api.parameters.instance.toolbar);
    var mb = tweak(api.parameters.instance.menubar);
    var ct = (api.parameters.instance.contentTypes || '').split(',').map(s => s.trim()).filter(s => !!s);
    var tp = (api.parameters.instance.titleProperty || '').split(',').map(s => s.trim()).filter(s => !!s);

    api.window.startAutoResizer();

    tinymce.init({
      selector: "#editor",
      plugins: p,
      toolbar: tb,
      menubar: mb,
      min_height: 600,
      max_height: 750,
      autoresize_bottom_margin: 15,
      resize: false,
      image_caption: true,
      ctf_select_ref_dialog: api.dialogs.selectSingleEntry,
      ctf_content_types: ct.length > 0 ? ct : undefined,
      ctf_title_prop: tp,
      init_instance_callback : function(editor) {
        var listening = true;

        function getEditorContent() {
          return editor.getContent() || '';
        }

        function getApiContent() {
          return api.field.getValue() || '';
        }

        function setContent(x) {
          var apiContent = x || '';
          var editorContent = getEditorContent();
          if (apiContent !== editorContent) {
            //console.log('Setting editor content to: [' + apiContent + ']');
            editor.setContent(apiContent);
          }
        }

        setContent(api.field.getValue());

        api.field.onValueChanged(function(x) {
          if (listening) {
            setContent(x);
          }
        });

        function onEditorChange() {
          var editorContent = getEditorContent();
          var apiContent = getApiContent();

          if (editorContent !== apiContent) {
            //console.log('Setting content in api to: [' + editorContent + ']');
            listening = false;
            api.field.setValue(editorContent).then(function() {
              listening = true;
            }).catch(function(err) {
              console.log("Error setting content", err);
              listening = true;
            });
          }
        }

        var throttled = _.throttle(onEditorChange, 500, {leading: true});
        editor.on('change keyup setcontent blur', throttled);
      }
    });
  }

  function loadScript(src, onload) {
    var script = document.createElement('script');
    script.setAttribute('src', src);
    script.onload = onload;
    document.body.appendChild(script);
  }

  var sub = location.host == "contentful.staging.tiny.cloud" ? "cdn.staging" : "cdn";
  var apiKey = api.parameters.installation.apiKey;
  var channel = api.parameters.installation.channel;
  var tinymceUrl = "https://" + sub + ".tiny.cloud/1/" + apiKey + "/tinymce/" + channel + "/tinymce.min.js";

  loadScript(tinymceUrl, function() {
    tinymce.PluginManager.add('ctfref', setupCtfRefPlugin);
    tinymceForContentful(api);
  });
});
