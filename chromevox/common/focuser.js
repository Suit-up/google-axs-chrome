// Copyright 2012 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Implements the setFocus function.
 * @author deboer@google.com (James deBoer)
 */

goog.provide('cvox.Focuser');

goog.require('cvox.ChromeVoxEventSuspender');
goog.require('cvox.DomUtil');


/**
 * Sets the browser focus to the targetNode or its closest ancestor that is
 * focusable.
 *
 * @param {Node} targetNode The node to move the browser focus to.
 * @param {boolean=} opt_focusDescendants Whether or not we check descendants
 * of the target node to see if they are focusable. If true, sets focus on the
 * first focusable descendant. If false, only sets focus on the targetNode or
 * its closest ancestor. Default is false.
 */
cvox.Focuser.setFocus = function(targetNode, opt_focusDescendants) {
  // Save the selection because Chrome will lose it if there's a focus or blur.
  var sel = window.getSelection();
  var range;
  if (sel.rangeCount > 0) {
    range = sel.getRangeAt(0);
  }
  // Blur the currently-focused element if the target node is not a descendant.
  if (document.activeElement &&
      !cvox.DomUtil.isDescendantOfNode(targetNode, document.activeElement)) {
    document.activeElement.blur();
  }

  // Video elements should always be focusable.
  if (targetNode && (targetNode.constructor == HTMLVideoElement)) {
    if (!cvox.DomUtil.isFocusable(targetNode)) {
      targetNode.setAttribute('tabIndex', 0);
    }
  }

  if (opt_focusDescendants && !cvox.DomUtil.isFocusable(targetNode)) {
    var focusableDescendant = cvox.DomUtil.findFocusableDescendant(targetNode);
    if (focusableDescendant) {
      targetNode = focusableDescendant;
    }
  } else {
    // Search up the parent chain until a focusable node is found.x
    while (targetNode && !cvox.DomUtil.isFocusable(targetNode)) {
      targetNode = targetNode.parentNode;
    }
  }

  // If we found something focusable, focus it - otherwise, blur it.
  if (cvox.DomUtil.isFocusable(targetNode)) {
    // Don't let the instance of ChromeVox in the parent focus iframe children
    // - instead, let the instance of ChromeVox in the iframe focus itself to
    // avoid getting trapped in iframes that have no ChromeVox in them.
    // This self focusing is performed by calling window.focus() in
    // cvox.NavigationManager.prototype.addInterframeListener_
    if (targetNode.tagName != 'IFRAME') {
      // setTimeout must be used because there's a bug (in Chrome, I think)
      // with .focus() which causes the page to be redrawn incorrectly if
      // not in setTimeout.
      if (cvox.ChromeVoxEventSuspender.areEventsSuspended()) {
        if (cvox.Focuser.shouldEnterSuspendEvents_(targetNode)) {
          cvox.ChromeVoxEventSuspender.enterSuspendEvents();
        }
        window.setTimeout(function() {
          targetNode.focus();
          cvox.ChromeVoxEventSuspender.exitSuspendEvents();
        }, 0);
      }
      else {
        window.setTimeout(function() {
            targetNode.focus();
        }, 0);
      }
    }
  } else if (document.activeElement &&
             document.activeElement.tagName != 'BODY') {
    document.activeElement.blur();
  }

  // Restore the selection, unless the focused item is a text box.
  if (cvox.DomUtil.isInputTypeText(targetNode)) {
    targetNode.select();
  } else if (range) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
};

/**
 * Rules for whether or not enterSuspendEvents should be called.
 * In general, we should not enterSuspendEvents if the targetNode will get some
 * special handlers attached when a focus event is received for it; otherwise,
 * the special handlers will not get attached.
 *
 * @param {Node} targetNode The node that is being focused.
 * @return {boolean} True if enterSuspendEvents should be called.
 */
cvox.Focuser.shouldEnterSuspendEvents_ = function(targetNode){
  if (targetNode.constructor && targetNode.constructor == HTMLVideoElement) {
    return false;
  }
  if (targetNode.hasAttribute && targetNode.getAttribute('type') == 'time') {
    return false;
  }
  return true;
};

