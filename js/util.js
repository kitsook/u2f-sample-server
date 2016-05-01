// Copyright (c) 2016 Clarence Ho (clarenceho at gmail dot com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var u2ferrors = {};

$(document).ready(function() {
  // convert u2f error codes;
  for(var key in u2f.ErrorCodes){
    u2ferrors[u2f.ErrorCodes[key]] = key;
  }
});

/**
 * Generates timestamp string
*/
function timeStamp() {
  // Create a date object with the current time
  var now = new Date();

  // Create an array with the current month, day and time
  var date = [ now.getMonth() + 1, now.getDate(), now.getFullYear() ];

  // Create an array with the current hour, minute and second
  var time = [ now.getHours(), now.getMinutes(), now.getSeconds() ];

  var milli = now.getMilliseconds();

  // Determine AM or PM suffix based on the hour
  var suffix = ( time[0] < 12 ) ? "AM" : "PM";

  // Convert hour from military time
  time[0] = ( time[0] < 12 ) ? time[0] : time[0] - 12;

  // If hour is 0, set it to 12
  time[0] = time[0] || 12;

  // If seconds and minutes are less than 10, add a zero
  for ( var i = 1; i < 3; i++ ) {
    if ( time[i] < 10 ) {
      time[i] = "0" + time[i];
    }
  }

  // pad milliseconds
  if (milli < 10) {
    milli = "00" + milli;
  } else if (milli < 100) {
    milli = "0" + milli;
  }

  // Return the formatted string
  return "[" + date.join("/") + " " + time.join(":") + "." + milli + " " + suffix + "]";
}

/**
 * Detects if the data structure represents U2F error.
 * And if so, whether the error code is non-zero
 */
function isU2fError(data) {
  if ((typeof data !== "undefined") && data.errorCode) {
    return true;
  }
  return false;
}

function logMsg(logger, msg, styleClass="log-msg") {
  var li = $("<p/>")
    .addClass(styleClass)
    .appendTo(logger);
  li.text(timeStamp() + " " + msg);

  logger.scrollTop(logger.prop("scrollHeight"));
}

function logErr(logger, msg) {
  logMsg(logger, msg, "error-item");
}

function logU2FError(logger, data) {
  if (isU2fError(data)) {
    logErr(logger, "Error(" + data.errorCode + "): " + u2ferrors[data.errorCode]);
  }
}

function logU2FResponse(logger, data) {
  logMsg(logger, "U2F token response message:\n" + JSON.stringify(data, null, "\t"));
  if ((typeof data !== "undefined") && data.errorCode) {
    logU2FError(logger, data);
  }
}
