;
(function(root, factory) {
  if(typeof define === 'function' && define.amd) {
    define(['jquery', 'jquery.tinyscrollbar', './DateFormat', './DateLocale', './DateRange', './DateTime', './CalendarBody'],
      function($, _tinyscrollbar, DateFormat, DateLocale, DateRange, DateTime, CalendarBody) {
        factory($, DateFormat, DateLocale, DateRange, DateTime, CalendarBody)
      })
  } else {
    factory(root.jQuery, root.DateFormat, root.DateLocale, root.DateRange, root.DateTime, root.CalendarBody)
  }
})(this, function($, DateFormat, DateLocale, DateRange, DateTime, CalendarBody) {
  $.fn.continuousCalendar = function(options) {
    return this.each(function() { _continuousCalendar.call($(this), options) })
    function _continuousCalendar(options) {
      var defaults = {
        weeksBefore    : 26,
        weeksAfter     : 26,
        firstDate      : null,
        lastDate       : null,
        startField     : $('input.startDate', this),
        endField       : $('input.endDate', this),
        isPopup        : false,
        selectToday    : false,
        locale         : DateLocale.EN,
        disableWeekends: false,
        disabledDates  : null,
        minimumRange   : -1,
        selectWeek     : false,
        fadeOutDuration: 0,
        callback       : $.noop,
        customScroll   : false,
        theme          : ''
      }
      var params = $.extend({}, defaults, options)
      var locale = DateLocale.fromArgument(params.locale)
      var Status = {
        CREATE_OR_RESIZE: 'create',
        MOVE            : 'move',
        NONE            : 'none'
      }
      var startDate = fieldDate(params.startField)
      var endDate = fieldDate(params.endField)
      var today = DateTime.now()

      if(params.selectToday) {
        var formattedToday = formatDate(today)
        startDate = today
        endDate = today
        setStartField(formattedToday)
        setEndField(formattedToday)
      }
      var container = this
      var mouseDownDate = null
      var averageCellHeight
      var selection
      var oldSelection
      var status = Status.NONE
      var calendarContainer
      var beforeFirstOpening = true
      var calendar
      var customScrollContainer
      var calendarBody = null
      var calendarRange

      $(this).addClass('continuousCalendarContainer').addClass(params.theme).append('&nbsp;') //IE fix for popup version
      createCalendar()

      function createCalendar() {
        calendar = $.extend(popUpBehaviour(params.isPopup), dateBehaviour(isRange()))
        selection = startDate && endDate ? new DateRange(startDate, endDate, locale) : DateRange.emptyRange(locale);
        oldSelection = selection.clone()
        params.disabledDates = params.disabledDates ? parseDisabledDates(params.disabledDates) : {}
        params.fadeOutDuration = parseInt(params.fadeOutDuration, 10)
        calendarContainer = getCalendarContainerOrCreateOne()
        calendarContainer.click(function(e) { e.stopPropagation() })
        if($('.startDateLabel', container).isEmpty()) addDateLabels(container, calendar)
        calendar.initUI()
        calendar.showInitialSelection()
        calendar.performTrigger()
      }

      function initScrollBar() { if(params.customScroll) customScrollContainer = $('.tinyscrollbar', container).tinyscrollbar() }

      function initCalendarTable() {
        if(calendarBody) return

        calendarRange = determineRangeToRenderFormParams(params)
        calendarBody = CalendarBody(calendarContainer, calendarRange, locale, params.customScroll, params.disableWeekends, params.disabledDates)
        bindScrollEvent()

        calendar.initState()
        calendar.addRangeLengthLabel()
        calendar.initEvents()
      }

      function determineRangeToRenderFormParams(params) {
        var firstWeekdayOfGivenDate = (startDate || DateTime.now()).getFirstDateOfWeek(locale)
        var firstDate = params.firstDate
        var lastDate = params.lastDate
        var rangeStart = firstDate ? DateFormat.parse(firstDate, locale) : firstWeekdayOfGivenDate.plusDays(-(params.weeksBefore * 7))
        var rangeEnd = lastDate ? DateFormat.parse(lastDate, locale) : firstWeekdayOfGivenDate.plusDays(params.weeksAfter * 7 + 6)

        return  new DateRange(rangeStart, rangeEnd)
      }

      function bindScrollEvent() {
        if(params.customScroll) {
          if(!customScrollContainer) initScrollBar()
          customScrollContainer.bind('scroll', setYearLabel)
        } else {
          var didScroll = false
          calendarBody.scrollContent.scroll(function() {
            didScroll = true
          })

          setInterval(function() {
            if(didScroll) {
              didScroll = false
              setYearLabel()
            }
          }, 250)
        }
      }

      function parseDisabledDates(dates) {
        var dateMap = {}
        $.each(dates.split(' '), function(index, date) { dateMap[DateFormat.parse(date).date] = true })
        return dateMap
      }

      function dateBehaviour(isRange) {
        var rangeVersion = {
          showInitialSelection: setRangeLabels,
          initEvents          : function() {
            initRangeCalendarEvents(container, calendarBody.bodyTable)
            drawSelection()
          },
          addRangeLengthLabel : function() {
            if($('.rangeLengthLabel', container).isEmpty()) {
              var rangeLengthContainer = $('<div class="label"><span class="rangeLengthLabel"></span></div>')
              $('.continuousCalendar', container).append(rangeLengthContainer)
            }
          },
          addEndDateLabel     : function(dateLabelContainer) { dateLabelContainer.append('<span class="separator"> - </span>').append('<span class="endDateLabel"></span>') },
          performTrigger      : function() {
            container.data('calendarRange', selection)
            executeCallback(selection)
          }
        }
        var singleDateVersion = {
          showInitialSelection: function() {
            if(params.startField.val())
              setDateLabel(DateFormat.format(DateFormat.parse(params.startField.val()), locale.weekDateFormat, locale))
          },
          initEvents          : function() {
            initSingleDateCalendarEvents()
            var selectedDateKey = startDate && DateFormat.format(startDate, 'Ymd', locale)
            if(selectedDateKey in calendarBody.dateCellMap) {
              calendarBody.getDateCell(calendarBody.dateCellMap[selectedDateKey]).addClass('selected')
            }
          },
          addRangeLengthLabel : $.noop,
          addEndDateLabel     : $.noop,
          performTrigger      : function() {
            container.data('calendarRange', startDate)
            executeCallback(startDate)
          }
        }
        return isRange ? rangeVersion : singleDateVersion

        function initSingleDateCalendarEvents() {
          $('.date', container).bind('click', function() {
            var dateCell = $(this)
            if(dateCell.hasClass('disabled')) return
            $('td.selected', container).removeClass('selected')
            dateCell.addClass('selected')
            var selectedDate = getElemDate(dateCell.get(0));
            params.startField.val(DateFormat.shortDateFormat(selectedDate, locale))
            setDateLabel(DateFormat.format(selectedDate, locale.weekDateFormat, locale))
            calendar.close(this)
            executeCallback(selectedDate)
          })
        }

        function setDateLabel(val) { $('span.startDateLabel', container).text(val) }

        function initRangeCalendarEvents(container, bodyTable) {
          $('span.rangeLengthLabel', container).text(locale.daysLabel(selection.days()))
          bodyTable.addClass(params.selectWeek ? 'weekRange' : 'freeRange')
          bodyTable.mousedown(mouseDown).mouseover(mouseMove).mouseup(mouseUp)
          disableTextSelection(bodyTable.get(0))
        }
      }

      function popUpBehaviour(isPopup) {
        var popUpVersion = {
          initUI               : function() {
            calendarContainer.addClass('popup').hide()
            var icon = $('<a href="#" class="calendarIcon">' + today.getDate() + '</a>').click(toggleCalendar)
            container.prepend('<div></div>')
            container.prepend(icon)
          },
          initState            : $.noop,
          getContainer         : function(newContainer) { return $('<div>').addClass('popUpContainer').append(newContainer); },
          close                : function(cell) { toggleCalendar.call(cell) },
          addDateLabelBehaviour: function(label) {
            label.addClass('clickable')
            label.click(toggleCalendar)
          }
        }
        var inlineVersion = {
          initUI               : initCalendarTable,
          initState            : calculateCellHeightAndSetScroll,
          getContainer         : function(newContainer) {
            return newContainer
          },
          close                : $.noop,
          addDateLabelBehaviour: $.noop
        }
        return isPopup ? popUpVersion : inlineVersion
      }

      function getCalendarContainerOrCreateOne() {
        var existingContainer = $('.continuousCalendar', container)
        if(existingContainer.exists()) {
          return existingContainer
        } else {
          var newContainer = $('<div>').addClass('continuousCalendar')
          container.append(calendar.getContainer(newContainer))
          return newContainer
        }
      }

      function addDateLabels(container, calendar) {
        var dateLabelContainer = $('<div class="label"><span class="startDateLabel"></span></div>')
        calendar.addEndDateLabel(dateLabelContainer)
        container.prepend(dateLabelContainer)
        calendar.addDateLabelBehaviour(dateLabelContainer.children())
      }

      function scrollToSelection() {
        var selectionStartOrToday = $('.selected, .today', calendarBody.scrollContent).get(0)
        if(selectionStartOrToday) {
          var position = selectionStartOrToday.offsetTop - (calendarBody.scrollContent.height() - selectionStartOrToday.offsetHeight) / 2
          if(params.customScroll) {
            var totalHeight = calendarBody.bodyTable.height()
            var maxScroll = totalHeight - calendarBody.scrollContent.height()
            var validPosition = position > maxScroll ? maxScroll : position
            customScrollContainer.tinyscrollbar_update(validPosition > 0 ? validPosition : 0)
          } else {
            calendarBody.scrollContent.scrollTop(position)
          }
        }
      }

      function setYearLabel() {
        var scrollContent = $('.calendarScrollContent', container).get(0)
        var table = $('table', scrollContent).get(0)
        var scrollTop = params.customScroll ? -$('.overview', calendarContainer).position().top : scrollContent.scrollTop
        var rowNumber = parseInt(scrollTop / averageCellHeight, 10)
        var date = getElemDate(table.rows[rowNumber].cells[2])
        calendarBody.yearTitle.text(date.getFullYear())
      }

      function calculateCellHeightAndSetScroll() {
        initScrollBar()
        calculateCellHeight()
        setYearLabel()
        scrollToSelection()
      }

      function calculateCellHeight() { averageCellHeight = parseInt(calendarBody.bodyTable.height() / $('tr', calendarBody.bodyTable).size(), 10) }

      function toggleCalendar() {
        initCalendarTable()
        if(calendarContainer.is(':visible')) {
          calendarContainer.fadeOut(params.fadeOutDuration)
          $(document).unbind('click.continuousCalendar')
        } else {
          calendarContainer.show()
          if(beforeFirstOpening) {
            initScrollBar()
            calculateCellHeight()
            setYearLabel()
            beforeFirstOpening = false
          }
          scrollToSelection()
          $(document).bind('click.continuousCalendar', toggleCalendar)

        }
        return false
      }

      function startNewRange() { selection = new DateRange(mouseDownDate, mouseDownDate, locale) }

      function mouseDown(event) {
        var elem = event.target
        var hasShiftKeyPressed = event.shiftKey
        if(isInstantSelection(elem, hasShiftKeyPressed)) {
          selection = instantSelection(elem, hasShiftKeyPressed)
          return
        }

        status = Status.CREATE_OR_RESIZE
        mouseDownDate = getElemDate(elem)

        if(mouseDownDate.equalsOnlyDate(selection.end)) {
          mouseDownDate = selection.start
          return
        }
        if(mouseDownDate.equalsOnlyDate(selection.start)) {
          mouseDownDate = selection.end
          return
        }
        if(selection.hasDate(mouseDownDate)) {
          status = Status.MOVE
          return
        }

        if(enabledCell(elem)) startNewRange()

        function enabledCell(elem) { return isDateCell(elem) && isEnabled(elem) }

        function isInstantSelection(elem, hasShiftKeyPressed) {
          if(params.selectWeek) return enabledCell(elem) || isWeekCell(elem)
          else return isWeekCell(elem) || isMonthCell(elem) || hasShiftKeyPressed

        }

        function instantSelection(elem, hasShiftKeyPressed) {
          if((params.selectWeek && enabledCell(elem)) || isWeekCell(elem)) {
            status = Status.NONE
            var firstDayOfWeek = getElemDate($(elem).parent().children('.date').get(0))
            return instantSelectWeek(firstDayOfWeek)
          } else if(isMonthCell(elem)) {
            status = Status.NONE
            var dayInMonth = getElemDate($(elem).siblings('.date').get(0))
            return new DateRange(dayInMonth.firstDateOfMonth(), dayInMonth.lastDateOfMonth(), locale)
          } else if(hasShiftKeyPressed) {
            if(selection.days() > 0 && enabledCell(elem)) {
              status = Status.NONE
              selection = selection.expandTo(getElemDate(elem))
              return selection
            }
          }
          return selection
        }

        function instantSelectWeek(firstDayOfWeek) {
          var firstDay = firstDayOfWeek
          var lastDay = firstDayOfWeek.plusDays(6)
          if(params.disableWeekends) {
            firstDay = firstDayOfWeek.withWeekday(DateTime.MONDAY)
            lastDay = firstDayOfWeek.withWeekday(DateTime.FRIDAY)
          }
          return new DateRange(firstDay, lastDay, locale).and(calendarRange)
        }
      }

      function mouseMove(event) {
        if(status == Status.NONE) return
        var date = getElemDate(event.target)
        var actions = {
          move  : function() {
            var deltaDays = mouseDownDate.distanceInDays(date)
            var movedSelection = selection.shiftDays(deltaDays).and(calendarRange)
            if(isPermittedRange(movedSelection)) {
              mouseDownDate = date
              selection = movedSelection
            }
          },
          create: function() {
            var newSelection = new DateRange(mouseDownDate, date, locale)
            if(isEnabled(event.target) && isPermittedRange(newSelection)) selection = newSelection
          }
        }
        actions[status]()
        drawSelection()
      }

      function isPermittedRange(newSelection) { return newSelection.isPermittedRange(params.minimumRange, params.disableWeekends, calendarRange) }

      function mouseUp() {
        status = Status.NONE
        if(rangeHasDisabledDate()) selection = DateRange.emptyRange()
        drawSelection()
        afterSelection()
      }

      function rangeHasDisabledDate() {
        for(var disabledDate in params.disabledDates) {
          if(selection.hasDate(new DateTime(disabledDate))) return true
        }
        return false
      }

      function drawSelection() {
        selection = DateRange.rangeWithMinimumSize(selection, params.minimumRange, params.disableWeekends, calendarRange)
        drawSelectionBetweenDates(selection)
        $('span.rangeLengthLabel', container).text(locale.daysLabel(selection.days()))
      }

      function drawSelectionBetweenDates(range) {
        $('td.selected', container).removeClass('selected').removeClass('rangeStart').removeClass('rangeEnd').removeClass('invalidSelection')
        iterateAndToggleCells(range)
        oldSelection = range.clone()
      }

      function iterateAndToggleCells(range) {
        if(range.days() == 0) return
        var startIndex = index(range.start)
        var endIndex = index(range.end)
        for(var i = startIndex; i <= endIndex; i++)
          calendarBody.getDateCell(i).get(0).className = dateCellStyle(calendarBody.dateCellDates[i], range.start, range.end).join(' ')
        if(rangeHasDisabledDate()) $('td.selected', container).addClass('invalidSelection')
        function index(date) { return calendarBody.dateCellMap[DateFormat.format(date, 'Ymd', locale)] }
      }

      function dateCellStyle(date, start, end) {
        var styleClass = [calendarBody.dateStyles(date)]
        if(date.equalsOnlyDate(end)) return styleClass.concat('selected rangeEnd')
        if(date.equalsOnlyDate(start)) return styleClass.concat('selected rangeStart')
        if(date.isBetweenDates(start, end)) return styleClass.concat('selected')
        return styleClass
      }

      function afterSelection() {
        if(rangeHasDisabledDate()) {
          selection = DateRange.emptyRange()
          // Flash invalidSelection styled cells when selection is expanded to minimum length
          setTimeout(function() { drawSelectionBetweenDates(selection) }, 200)
        }
        var formattedStart = formatDate(selection.start)
        var formattedEnd = formatDate(selection.end)
        container.data('calendarRange', selection)
        setStartField(formattedStart)
        setEndField(formattedEnd)
        setRangeLabels()
        if(params.selectWeek) calendar.close($('td.selected', container).first())
        executeCallback(selection)
      }

      function setRangeLabels() {
        if(selection.start && selection.end) {
          var format = locale.weekDateFormat
          $('span.startDateLabel', container).text(DateFormat.format(selection.start, format, locale))
          $('span.endDateLabel', container).text(DateFormat.format(selection.end, format, locale))
          $('span.separator', container).show()
        } else {
          $('span.separator', container).hide()
        }
      }

      function fieldDate(field) { return field.length > 0 && field.val().length > 0 ? DateFormat.parse(field.val()) : null }

      function disableTextSelection(elem) {
        //Firefox
        $(elem).css('MozUserSelect', 'none')
        //IE
        $(elem).bind('selectstart', function() { return false })
        //Opera, etc.
        $(elem).mousedown(function() { return false })
      }

      function executeCallback(selection) {
        params.callback.call(container, selection)
        container.trigger('calendarChange', selection)
      }

      function isDateCell(elem) { return $(elem).closest('[date-cell-index]').hasClass('date') }

      function isWeekCell(elem) { return $(elem).hasClass('week') }

      function isMonthCell(elem) { return $(elem).hasClass('month') }

      function isEnabled(elem) { return !$(elem).hasClass('disabled') }

      function getElemDate(elem) { return calendarBody.dateCellDates[$(elem).closest('[date-cell-index]').attr('date-cell-index')] }

      function setStartField(value) { params.startField.val(value) }

      function setEndField(value) { params.endField.val(value) }

      function formatDate(date) { return date ? DateFormat.shortDateFormat(date, locale) : '' }

      function isRange() { return params.endField && params.endField.length > 0 }
    }
  }
  $.fn.calendarRange = function() { return $(this).data('calendarRange') }
  $.fn.exists = function() { return this.length > 0 }
  $.fn.isEmpty = function() { return this.length == 0 }
})
