console.log(i18n("app_name") + ": init options.js");

window.addEventListener('load', (evt) => {

   const Conf = {

      attrDependencies: () => {
         Array.from(document.querySelectorAll("[data-dependent]"))
            .forEach(dependentItem => {
               // let dependentsList = dependentItem.getAttribute('data-dependent').split(',').forEach(i => i.trim());
               let dependentsJson = JSON.parse(dependentItem.getAttribute('data-dependent').toString());

               let handler = function () {
                  showOrHide(dependentItem, dependentsJson);
               };
               // init state
               handler();

               let dependentTag = document.getElementById(Object.keys(dependentsJson))
               if (dependentTag) dependentTag.addEventListener("change", handler);
            });

         function showOrHide(dependentItem, dependentsList) {
            for (const name in dependentsList)
               for (const thisVal of dependentsList[name]) {
                  let reqParent = document.getElementsByName(name)[0];
                  if (!reqParent) {
                     console.error('error showOrHide:', name);
                     continue;
                  }

                  if (reqParent.checked && thisVal) {
                     // console.log('reqParent.checked');
                     dependentItem.classList.remove("hide");

                  } else if (reqParent.value == thisVal) {
                     dependentItem.classList.remove("hide");
                     // console.log(reqParent.value + '==' + thisVal);
                     break;

                  } else {
                     dependentItem.classList.add("hide");
                     // console.log(reqParent.value + '!=' + thisVal);
                  }
               }
         }
      },

      // Saves options to localStorage/chromeSync.
      saveOptions: (form, callback) => {
         let formData = new FormData(form);
         let newOptions = {};

         // add unchecked checkboxes
         // NOTE broked checkbox fill
         // let inputs = document.getElementsByTagName("input");
         // for (let i in inputs) {
         //    let el = inputs[i];
         //    if (el.type == "checkbox") {
         //       // formData.append(el.name, el.checked ? el.value : false);
         //       formData.append(el.name, el.checked ? true : false);
         //    }
         // }

         for (const [key, value] of formData.entries()) {
            // console.log(key, value);
            newOptions[key] = value;
         }

         Storage.setParams(newOptions, 'sync');

         chrome.extension.sendMessage({
            "action": 'setOptions',
            "options": newOptions
         }, function (resp) {
            if (callback && typeof (callback) === "function") {
               return callback();
            }
         });
      },

      bthSaveAnimation: {
         outputStatus: document.querySelector("button"),

         _process: () => {
            Conf.bthSaveAnimation.outputStatus.innerHTML = i18n("opt_bth_save_settings_process");
            Conf.bthSaveAnimation.outputStatus.classList.add("disabled");
            Conf.bthSaveAnimation.outputStatus.classList.add("in-progress");
         },

         _processed: () => {
            Conf.bthSaveAnimation.outputStatus.innerHTML = i18n("opt_bth_save_settings_processed");
            Conf.bthSaveAnimation.outputStatus.classList.remove("in-progress");
         },

         _defaut: () => {
            setTimeout(function () {
               Conf.bthSaveAnimation._processed();
               Conf.bthSaveAnimation.outputStatus.innerHTML = i18n("opt_bth_save_settings");
               Conf.bthSaveAnimation.outputStatus.classList.remove("disabled");
            }, 300);
         },
      },

      getPermissions: (requested, event) => {
         if (Array.isArray(requested) && (event.target.checked || event.target.options)) {
            // Permissions must be requested
            chrome.permissions.contains({
               permissions: requested
            }, granted => {
               chrome.permissions.request({
                  permissions: requested,
               }, granted => {
                  // The callback argument will be true if the user granted the permissions.
                  event.target.checked = granted ? true : false;
                  event.target.selectedIndex = granted ? event.target.selectedIndex : event.target.selectedIndex === 0 ? -1 : 0;
                  Conf.attrDependencies(); //fix trigger
               });
            });
         }
      },

      // Register the event handlers.
      eventListener: () => {
         document.forms[0] // get form
            .addEventListener('submit', function (event) {
               event.preventDefault();
               Conf.bthSaveAnimation._process();
               Conf.saveOptions(this, Conf.bthSaveAnimation._processed);
               Conf.bthSaveAnimation._defaut();
            }, false);

         document.getElementById('showNotification')
            .addEventListener("change", function (event) {
               // console.log('event.type: %s', event.type);
               Conf.getPermissions(['notifications', 'downloads.open'], event);
            });

         document.getElementById('toolbarBehavior')
            .addEventListener("change", function (event) {
               // console.log('event.type: %s', event.type);
               if (this.value === 'popup') {
                  Conf.getPermissions(['downloads.open'], event);
               }
            });

         document.getElementById('back-history')
            .addEventListener("click", function (event) {
               history.back()
            });
      },

      init: () => {
         let callback = (res) => {
            UIr.restoreElmValue(res);
            Conf.attrDependencies();

            document.querySelector("body").classList.remove("preload");

            if (location.href.substr(-1) === "#") {
               document.getElementById("back-history").style.display = "unset";
            }

            // show warn
            chrome.downloads.search({
               state: 'in_progress',
               paused: false
            }, (downloads) => downloads.length && document.getElementsByClassName('warn')[0].classList.remove("hide"));

            Conf.oggSupport();

         };
         Storage.getParams(callback, 'sync');

         Conf.eventListener();
      },

      // .ogg does support
      oggSupport: () => {
         if (new Audio().canPlayType('audio/ogg; codecs="vorbis"')) return;

         let inputAudio = document.getElementsByName('soundNotification')[0];
         inputAudio.checked = false;
         inputAudio.disabled = true;
         let warnMsg = 'Your browser does not support the .ogg audio file'
         inputAudio.title = warnMsg;
         inputAudio.parentElement.setAttribute("tooltip", warnMsg);

      }
   }

   Conf.init();
});
