//= require surveyor/jquery-ui-1.10.0.custom
//= require surveyor/jquery-ui-timepicker-addon
//= require surveyor/jquery.selectToUISlider
//= require surveyor/jquery.maskedinput

// Javascript UI for surveyor
$(document).ready(function(){
  // if(jQuery.browser.msie){
  //  // IE has trouble with the change event for form radio/checkbox elements - bind click instead
  //  jQuery("form#survey_form input[type=radio], form#survey_form [type=checkbox]").bind("click", function(){
  //    jQuery(this).parents("form").ajaxSubmit({dataType: 'json', success: successfulSave});
  //  });
  //  // IE fires the change event for all other (not radio/checkbox) elements of the form
  //  jQuery("form#survey_form *").not("input[type=radio], input[type=checkbox]").bind("change", function(){
  //    jQuery(this).parents("form").ajaxSubmit({dataType: 'json', success: successfulSave});
  //  });
  // }else{
  //  // Other browsers just use the change event on the form

  //
  // Uncomment the following to use the jQuery Tools Datepicker (http://jquerytools.org/demos/dateinput/index.html)
  // instead of the default jQuery UI Datepicker (http://jqueryui.com/demos/datepicker/)
  //
  // For a date input, i.e. using dateinput from jQuery tools, the value is not updated
  // before the onChange or change event is fired, so we hang this in before the update is
  // sent to the server and set the correct value from the dateinput object.
  // jQuery('li.date input').change(function(){
  //     if ( $(this).data('dateinput') ) {
  //         var date_obj = $(this).data('dateinput').getValue();
  //         this.value = date_obj.getFullYear() + "-" + (date_obj.getMonth()+1) + "-" +
  //             date_obj.getDate() + " 00:00:00 UTC";
  //     }
  // });
  //
  // $('li input.date').dateinput({
  //     format: 'dd mmm yyyy'
  // });

  // Default Datepicker uses jQuery UI Datepicker
  $("input[type='text'].datetime").datetimepicker({
    showSecond: true,
    showMillisec: false,
    timeFormat: 'HH:mm:ss',
    dateFormat: 'yy-mm-dd',
    changeMonth: true,
    changeYear: true
  });

  $("li.date input, input[type='text'].date, input[type='text'].datepicker").datepicker({
    dateFormat: 'yy-mm-dd',
    changeMonth: true,
    changeYear: true
  });

  $("input[type='text'].time").timepicker({});

  $('.surveyor_check_boxes input[type=text]').change(function(){
    var textValue = $(this).val()
    if (textValue.length > 0) {
      $(this).parent().children().has('input[type="checkbox"]')[0].children[0].checked = true;
    }
  });

  $('.surveyor_radio input[type=text]').change(function() {
    if ($(this).val().length > 0) {
      $(this).parent().children().has('input[type="radio"]')[0].children[0].checked = true;
    }
  });

  // http://www.filamentgroup.com/lab/update_jquery_ui_slider_from_a_select_element_now_with_aria_support/
  $('fieldset.q_slider select').each(function(i,e) {
    $(e).selectToUISlider({"labelSrc": "text"}).hide()
  });

  // If javascript works, we don't need to show dependents from
  // previous sections at the top of the page.
  $("#dependents").remove();

  function successfulSave(responseText) {
    // surveyor_controller returns a json object to show/hide elements
    // e.g. {"hide":["question_12","question_13"],"show":["question_14"]}
    $.each(responseText.show, function(){ showElement(this) });
    $.each(responseText.hide, function(){ hideElement(this) });

    $(document).trigger('surveyor-update', responseText);
    return false;
  }

  function showElement(id){
    group = id.match('^g_') ? true : false;
    if (group) {
      $('#' + id).removeClass("g_hidden");
    } else {
      $('#' + id).removeClass("q_hidden");
    }
  }

  function hideElement(id){
    group = id.match('^g_') ? true : false;
    if (group) {
      $('#' + id).addClass("g_hidden");
    } else {
      $('#' + id).addClass("q_hidden");
    }
  }

  // is_exclusive checkboxes should disble sibling checkboxes
  $('input.exclusive:checked').parents('fieldset[id^="q_"]').
    find(':checkbox').
    not(".exclusive").
    attr('checked', false).
    attr('disabled', true);

  $('input.exclusive:checkbox').click(function(){
    var e = $(this);
    var others = e.parents('fieldset[id^="q_"]').find(':checkbox').not(e);
    if(e.is(':checked')){
      others.attr('checked', false).attr('disabled', 'disabled');
    }else{
      others.attr('disabled', false);
    }
  });

  $("input[data-input-mask]").each(function(i,e){
    var inputMask = $(e).attr('data-input-mask');
    var placeholder = $(e).attr('data-input-mask-placeholder');
    var options = { placeholder: placeholder };
    $(e).mask(inputMask, options);
  });

  // translations selection
  $(".surveyor_language_selection").show();
  $(".surveyor_language_selection select#locale").change(function(){ this.form.submit(); });

  $("#survey_form").each(function() {
    var $form = $(this)
    var csrfToken = $form.find("input[name='authenticity_token']")

    $form.find("input, select, textarea").change(function() {
      var $field = $(this)

      // Detect and mark autocompleted fields
      markAutocompleted($field, $form)

      checkMetadataFields($field, $form)

      // Save changes to this field
      saveFormElements($form, questionFields($field).add(csrfToken), function() {
        validateField($field, $form, csrfToken)
        checkMetadataFields($field, $form)
      })
    })
  })

  function validateField($field, $form, csrfToken) {
    // Cache row element on field
    var $row = bindQuestionRow($field);

    // Cancel any ajax callbacks
    if ($field.data('cancel-callbacks')) $field.data('cancel-callbacks')()

    // Reset styles
    $row.removeClass('loading').removeClass('no-response').removeClass('ok').removeClass('warning')

    if ($field.val() && $field.val().match(/[^\s]/)) {

      // Attempt to autocomplete fields
      if ($row.data('reference-identifier') == 'documentationUrl') {

        $row.addClass('loading')

        $field.data('cancel-callbacks', autocomplete($field.val(), {
          beforeProcessing: function() {
            // Mark questions which have selected radio buttons or checkboxes
            $form.find('fieldset.question-row').each(function() {
              var $row = $(this);
              $row.toggleClass('touched', $row.find('input:checked').filter('[type=radio], [type=checkbox]').length > 0)
            })
          },
          success: function($fields) {
            $row.addClass('ok')
            $row.removeClass('loading')

            // Mark fields as autcompleted
            markAutocompleted($fields, $form)

            // Run validation on each field
            $fields.each(function() { validateField($(this), $form, csrfToken) })

            // Save autocompleted fields
            saveFormElements($form, questionFields($fields).add(csrfToken))

            // Trigger status panel update
            $('#status_panel').trigger('update');
          },

          fail: function() {
            $row.addClass('warning')
            $row.removeClass('loading')

            var message = $row.hasClass('autocompleted') ? 'autocompleted-url-incorrect' : 'url-incorrect'
            $row.find('.status-message span').text($form.find('#surveyor').data(message))
          }
        }))
      }

      // Attempt to verify URL
      else if ($field.attr('type') == 'url') {

        $row.addClass('loading')

        $field.data('cancel-callbacks', verifyUrl($field.val(), {
          success: function() {
            $row.addClass('ok')
            $row.removeClass('loading')
          },

          fail: function() {
            $row.addClass('warning')
            $row.removeClass('loading')

            var message = $row.hasClass('autocompleted') ? 'autocompleted-url-incorrect' : 'url-incorrect'
            $row.find('.status-message span').text($form.find('#surveyor').data(message))
          }
        }))
      }

      // Approve regular field
      else {
        $row.addClass('ok')
      }
    }

    // Show errors for missing mandatory fields
    else {
      $row.addClass('no-response')
    }
  }

  function bindQuestionRow($field) {
    var $row = $field.data('question-row') || $field.closest('.question-row')
    $field.data('question-row', $row)
    return $row;
  }

  function verifyUrl(url, callbacks) {
    if (!validateUrl(url)) return callbacks.fail();

    $.getJSON('/resolve', { url: url } )
      .done(function(json) {
        if (json.status == 200) {
          callbacks.success()
        } else {
          callbacks.fail()
        }
      })

    // Function to clear callbacks if this request is superceeded
    return function() {
      callbacks.success = function() {}
      callbacks.fail = function() {}
    }
  }

  function validateUrl(url) {
    return url.match(/^(https?:\/\/)[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?/i)
  }

  function questionFields($field) {
    return $field.closest('fieldset.question-row').find("input, select, textarea");
  }

  function answerIdentifier($question, $answer) {
    return $question + '_' + $answer
  }

  function markAutocompleted($fields, $form) {
    $fields.each(function() {
      var $row = bindQuestionRow($(this))
      var $input = $row.find('li.input')
      var question = $row.data('reference-identifier');

      var autocompleted = false

      if ($row.data('autocompleted-value')) {
        var autoValue = $row.data('autocompleted-value').toString()

        if ($input.hasClass('string')) {
          autocompleted = autoValue == $row.find('input.string').val()
        }

        if ($input.hasClass('select')) {
          autocompleted = answerIdentifier($row.data('reference-identifier'), autoValue) == $row.find('option:selected').data('reference-identifier')
        }

        if ($input.hasClass('surveyor_check_boxes') || $input.hasClass('surveyor_radio')) {
          var autoValues = autoValue.split(',').map(function(value) { return answerIdentifier(question, value); }).sort()
          var selectedValues = $row.find('li:has(input:checked)').map(function() { return $(this).data('reference-identifier'); }).get().sort()
          var equalLength = selectedValues.length == autoValues.length
          autocompleted = equalLength && autoValues.filter(function(value, i) { return value != selectedValues[i]; }).length == 0
        }
      }

      $row.find('input[id$="_autocompleted"]').val(autocompleted);
      $row.toggleClass('autocompleted', autocompleted)

      // Set autocompleted message
      if (autocompleted) {
        $row.find('.status-message span').text($form.find('#surveyor').data('autocompleted'))
      }
    })
  }

  function checkMetadataFields($fields, $form) {
    $fields.each(function() {
      var $row = bindQuestionRow($(this))
      var $input = $row.find('li.input')
      var question = $row.data('reference-identifier');

      if ($row.data('metadata-field') && $row.data('autocompleted-value')) {
        var autoValue = $row.data('autocompleted-value').toString()

        if ($input.hasClass('surveyor_check_boxes')) {
          var autoValues = autoValue.split(',').map(function(value) { return answerIdentifier(question, value); }).sort()
          var selectedValues = $row.find('li:has(input:checked)').map(function() { return $(this).data('reference-identifier'); }).get().sort()

          var $answers = $row.find('.surveyor_check_boxes').removeClass('warning')

          var missingValues = selectedValues.filter(function(value) { return autoValues.indexOf(value) === -1; })
          if (missingValues.length) {
            $row.removeClass('ok').addClass('warning')
            $row.find('.status-message span').text($form.find('#surveyor').data('missing-metadata'))

            missingValues.map(function(value) {
              $answers.filter('[data-reference-identifier="'+ value +'"]').addClass('warning')
            })
          }
          else {
            $row.removeClass('warning').addClass('ok')
          }
        }
      }
    })
  }

  function saveFormElements($form, $elements, callback) {
    $.ajax({
      type: "PUT",
      url: $form.attr("action"),
      data: $elements.serialize(), dataType: 'json',
      success: function(response) {
        successfulSave(response);
        if (callback) callback();
      },
      error: function(){
        // This throws on aborted requests (so when the save button is clicked and page unloaded while it is being sent)
        // would be good to have this in still, though to stop the alert when you save (and it has saved), removing for now
        //alert("an error occured when saving your response");
      }
    });
  }

  // Collects a sparse array of jQuery objects into a single jQuery object
  function toJquery(array) {
    return $(array.filter(function(field) { return field; })).map(function() { return this.toArray() })
  }

  // Checks if a string is empty (blank or whitespace only)
  function empty(text) {
    return !text || text.match(/^[\s]*$/)
  }

  function fillField(question, answer) {
    var $row = $('fieldset[data-reference-identifier="'+ question +'"]')
    $row.data('autocompleted-value', $.isArray(answer) ? answer.join(',') : answer);
    var $input = $row.find('li.input')

    if ($input.hasClass('string')) {
      return fillMe($row, question, answer)
    }

    if ($input.hasClass('select')) {
      return selectMe($row, question, answer)
    }

    if ($input.hasClass('surveyor_check_boxes') || $input.hasClass('surveyor_radio')) {
      if ($.isArray(answer)) {
        return toJquery(answer.map(function(option) { return checkMe($row, question, option) }))
      }

      return checkMe($row, question, answer)
    }
  }

  // Utility function to select nth option
  function selectMe($row, question, answer) {
    var $field = $row.find('select')
    if ($field.val()) return
    return $field.children('option[data-reference-identifier="'+ answerIdentifier(question,answer) +'"]').prop('selected', true)
  }

  // Utility function to populate input fields by identifier
  function fillMe($row, question, value) {
    var $field = $row.find('input.string')
    if (!empty($field.val()) || empty(value)) return
    return $field.val(value)
  }

  // Utility function to check input fields by identifier
  function checkMe($row, question, answer) {
    if ($row.hasClass('touched')) return
    return $row.find('li[data-reference-identifier="'+ answerIdentifier(question,answer) +'"] input').prop('checked', true)
  }

  // Data Kitten autocompletion
  function autocomplete(url, callbacks) {
    if (!validateUrl(url)) return callbacks.fail();

    var id = $('#surveyor').data('response-id')

    $.post('/surveys/response_sets/'+id+'/autofill', {url: url, dataType: 'json'})
      .error(callbacks.fail)
      .done(function(json) {

        callbacks.beforeProcessing();

        var affectedFields = [];

        if (json.data_exists) {
          var field;
          for (field in json.data) {
            affectedFields.push(fillField(field, json.data[field]));
          }
        }

        callbacks.success(toJquery(affectedFields));
      })

    // Function to clear callbacks if this request is superceeded
    return function() {
      callbacks.beforeProcessing = function() {}
      callbacks.success = function() {}
      callbacks.fail = function() {}
    }
  }
})
