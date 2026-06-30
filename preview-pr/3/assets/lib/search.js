(function() {
  "use strict";
  $(function() {
    var $form, $input, $matchesString, $progress, $results, $similar, $similarList, ajax, displayResults, generateWordList, loadsearchIndex, parseForm, searchIndex, selectForm, template, typeTimer, updateHash, wordsplit;
    $form = $('#search-form');
    $input = $('#search-input');
    $similar = $('#similar');
    $similarList = $('#similar-list');
    $matchesString = $('#matches');
    $results = $('#results');
    $progress = $('#progress');
    template = $('#template').html();
    searchIndex = null;
    ajax = new $.Deferred();
    wordsplit = /[\s,;!?=\+"'\\\/]+/;
    typeTimer = null;
    generateWordList = function() {
      window.wordlistAll = {};
      searchIndex.pages.forEach(function(obj, pageId) {
        return obj.wordlist.toUpperCase().split(/\s+/).forEach(function(word) {
          var e;
          if (word === '') {
            return;
          }
          wordlistAll[word] || (wordlistAll[word] = []);
          try {
            wordlistAll[word].push(pageId);
          } catch (error) {
            e = error;
            console.log("Problem:", word, pageId);
          }
        });
      });
      return searchIndex.words = wordlistAll;
    };
    loadsearchIndex = function() {
      if (ajax.state() === "resolved" && ajax.state() === "pending") {
        return;
      }
      return $.get('https://Venefilyn.github.io/cockpit-project.github.io/preview-pr/3/search.json', function(data) {
        searchIndex = data;
        if (!data.words) {
          generateWordList();
        }
        return ajax.resolve(data);
      });
    };
    displayResults = function(words, matches, similar) {
      var $pending, $snippet, fakedate, i, len, match, page, pages, text;
      $pending = $('<div class="pending"/>');
      pages = searchIndex.pages;
      text = $input.val().toLowerCase().replace(/ ?-\w+/g, '').replace(/\+/g, '');
      $('#results-none').hide();
      if (matches.length > 0) {
        fakedate = (new Date).toISOString();
        matches.sort(function(a, b) {
          var dateA, dateB, dateScoreA, dateScoreB, scoreA, scoreB, summA, summB, titleA, titleB;
          dateA = pages[a].date || fakedate;
          dateB = pages[b].date || fakedate;
          titleA = pages[a].title.toLowerCase().score(text);
          titleB = pages[b].title.toLowerCase().score(text);
          summA = pages[a].summary.toLowerCase().score(text);
          summB = pages[b].summary.toLowerCase().score(text);
          dateScoreA = Date.parse(dateA.split(' ')[0]) / Date.now() * 0.05;
          dateScoreB = Date.parse(dateB.split(' ')[0]) / Date.now() * 0.05;
          scoreA = pages[a].score = (titleA * 3 + summA + dateScoreA) / 5 / 0.71;
          scoreB = pages[b].score = (titleB * 3 + summB + dateScoreB) / 5 / 0.71;
          return scoreB - scoreA;
        });
        for (i = 0, len = matches.length; i < len; i++) {
          match = matches[i];
          page = pages[match];
          $snippet = $(template);
          $snippet.removeClass('hidden').find('.title').html(page.title).attr('href', page.url).end().find('.url').html(page.url).attr('href', page.url).end().find('.summary').html(page.summary).end();
          if (page.date) {
            $snippet.find('.date').text(page.datestring).end();
          } else {
            $snippet.find('.date').remove().end();
          }
          $pending.append($snippet);
        }
      } else {
        if ($input.val() !== '') {
          $('#results-none').removeClass('hidden').show();
        }
      }
      $results.html($pending.children());
      if (similar.length > 0) {
        $similar.removeClass('hidden').hide();
        $similarList.html(function() {
          var result;
          result = '';
          $.each(similar, function(k, v) {
            var rating;
            rating = "Score: " + Math.round(v.score * 50) / 10;
            return result += '<a href="#%" title="$">%</a> '.replace(/%/g, v.word).replace(/\$/, rating);
          });
          return result;
        });
        $similar.show();
      } else {
        $similar.hide();
        $matchesString.hide();
        $similarList.html('');
      }
      $matchesString.find('.number').html(matches.length).end().find('.plural').toggle(matches.length !== 1).end().removeClass('hidden').toggle(matches.length !== 0);
      $progress.hide();
      return $input.focus();
    };
    parseForm = function() {
      $progress.removeClass('hidden').show();
      return $.when(ajax).done(function(data) {
        var i, len, matchers, polarity, results, similar, text, word, wordMatch, words;
        text = $input.val();
        words = text.toLowerCase().trim().split(wordsplit);
        similar = [];
        matchers = {
          matches: [],
          antimatches: []
        };
        for (i = 0, len = words.length; i < len; i++) {
          word = words[i];
          polarity = word.match(/^-/) ? 'antimatches' : 'matches';
          word = word.replace(/^-/, '').replace(/\.$/, '');
          wordMatch = data.words[word.toUpperCase()];
          if (wordMatch) {
            if (matchers[polarity].length < 1) {
              matchers[polarity] = wordMatch;
            } else {
              if (polarity === 'matches') {
                matchers[polarity] = matchers[polarity].map(function(a) {
                  if (!(wordMatch.indexOf(a) < 0)) {
                    return a;
                  }
                });
              } else {
                matchers[polarity] = matchers[polarity].concat(wordMatch.filter(function(item) {
                  return matchers[polarity].indexOf(item) < 0;
                }));
              }
            }
          }
          if (polarity === 'matches') {
            $.map(searchIndex.words, function(data, key) {
              var keyLow, matchscore;
              keyLow = key.toLowerCase();
              matchscore = keyLow.score(word, 0.5);
              if ((matchscore > 0.7) && !similar.filter(function(s) {
                return s.word === keyLow;
              })[0] && word !== keyLow) {
                return similar.push({
                  word: keyLow,
                  score: matchscore
                });
              }
            });
          }
        }
        similar.sort(function(a, b) {
          var ref;
          return (ref = a.score < b.score) != null ? ref : {
            a: b
          };
        });
        results = matchers['matches'].filter(function(match) {
          if (matchers['antimatches'].indexOf(match) < 0) {
            return match;
          }
        });
        return displayResults(words, results, similar.slice(0, 21));
      });
    };
    selectForm = function() {
      return setTimeout(function() {
        return $input.focus().select();
      }, 0);
    };
    updateHash = function() {
      return window.location.hash = "#" + $input.val().trim();
    };
    window.trigger404 = function(val) {
      var keywords;
      if ($input.val() === '') {
        keywords = decodeURIComponent(document.location.pathname).replace(val, '').replace('blog', '').replace(/.html$/, '').replace(/.md$/, '').replace(/[\/\-\_\+]/g, ' ').replace(/^\s+|\s+$/g, '');
        $input.val(keywords);
        return parseForm();
      }
    };
    loadsearchIndex();
    $form.on('keydown', function(e) {
      switch (e.key) {
        case "Tab":
        case "Down":
        case "ArrowDown":
          $('#similar a:first,#results a').first().focus();
          return e.preventDefault();
        case "Left":
        case "ArrowLeft":
        case "Right":
        case "ArrowRight":
        case "Home":
        case "End":
        case "Esc":
        case "Escape":
        case "Enter":
          break;
        default:
          if (!(e.ctrlKey || e.altKey)) {
            clearTimeout(typeTimer);
            return typeTimer = setTimeout(updateHash, 500);
          }
      }
    }).on('submit', function(e) {
      updateHash();
      return e.preventDefault();
    });
    $similar.on('keydown', 'a', function(e) {
      switch (e.key) {
        case "Right":
        case "ArrowRight":
          return $(this).next().focus();
        case "Left":
        case "ArrowLeft":
          return $(this).prev().focus();
        case "Up":
        case "ArrowUp":
          return selectForm();
        case "Down":
        case "ArrowDown":
          return $('#results a:first').focus();
        case " ":
          return $(this).click();
        case "Enter":
          return selectForm();
      }
    });
    $results.on('keydown', 'a', function(e) {
      var $article, firstChild;
      $article = $(this).parentsUntil('#results');
      switch (e.key) {
        case "Down":
        case "ArrowDown":
          return $article.next().find('a:first').focus();
        case "Up":
        case "ArrowUp":
          firstChild = $article.filter(':first-child').length !== 1;
          if (firstChild) {
            return selectForm();
          } else {
            return $article.prev().find('a:first').focus();
          }
      }
    }).on('focus', 'a', function(e) {
      return $(this).parentsUntil('#results').addClass('highlight');
    }).on('blur', 'a', function(e) {
      return $(this).parentsUntil('#results').removeClass('highlight');
    });
    $(document).on('keydown', function(e) {
      switch (e.key) {
        case "Esc":
        case "Escape":
          $input.val('');
          return updateHash();
      }
    });
    $.when(ajax).done(function(data) {
      return parseForm();
    });
    $(window).on('hashchange', function(e) {
      var val;
      val = this.location.hash.substr(1);
      $input.val(decodeURIComponent(val));
      return parseForm();
    });
    if (window.location.hash) {
      $(window).trigger('hashchange');
    }
    return selectForm();
  });

}).call(this);
