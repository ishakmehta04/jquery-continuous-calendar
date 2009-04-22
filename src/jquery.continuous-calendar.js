(function($) {
  $.fn.continuousCalendar = function(params) {
    var weekDays = ["ma", "ti", "ke", "to", "pe", "la", "su"];
    var months = ["tammikuu", "helmikuu", "maaliskuu", "huhtikuu", "toukokuu", "kesäkuu", "heinäkuu", "elokuu", "syyskuu", "lokakuu", "marraskuu", "joulukuu"];
    var selectedDate = new Date(params.date[1] + "/" + params.date[0] + "/" + params.date[2]);
    var firstWeekdayOfGivenDate = selectedDate.getFirstDateOfWeek(Date.MONDAY);

    createCalendar(this);

    function createCalendar(container) {
      container.empty();
      var headerTable = $("<table>").addClass("calendarHeader").append(header());
      var bodyTable = $("<table>").addClass("calendarBody").append(weekRange(params.weeksBefore, params.weeksAfter));
      var scrollContent = $("<div>").addClass("calendarScrollContent").append(bodyTable);
      var calendar = $("<div>").addClass("continuousCalendar").append(headerTable).append(scrollContent);
      container.append(calendar);
    }

    function header() {
      var year = $("<th>").addClass("year").append(selectedDate.getFullYear());
      var thead = $("<thead>").append(year);
      $(weekDays).each(function() {
        var weekDay = $('<th>').append(this.toString()).addClass("weekDay");
        thead.append(weekDay);
      });
      return thead;
    }

    function weekRange(before, after) {
      var markup = $("<tbody>");
      for (var i = before; i >= -after; i--) {
        markup.append(week(firstWeekdayOfGivenDate.plusDays(i * (-weekDays.length))));
      }
      return markup;
    }

    function week(firstDayOfWeek) {
      var markup = $("<tr>");
      markup.append(month(firstDayOfWeek));
      for (var i = 0; i < weekDays.length; i++) {
        var date = firstDayOfWeek.plusDays(i);
        var dateCell = $("<td>").addClass("date").addClass(backgroundBy(date)).append(date.getDate());
        if (date.isToday()) {
          dateCell.addClass("today");
        }
        if (date.compareTo(selectedDate) == 0) {
          dateCell.addClass("selected");
        }
        markup.append(dateCell);
      }
      return markup;
    }

    function month(firstDayOfWeek) {
      var markup = $("<th>");
      if (firstDayOfWeek.getDate() <= weekDays.length) {
        markup.append(months[firstDayOfWeek.getMonth()]);
        markup.addClass("month");
      }
      markup.addClass(backgroundBy(firstDayOfWeek));
      return markup;
    }

    function backgroundBy(date) {
      return date.isOddMonth() ? ' odd' : '';
    }
  };
})(jQuery);