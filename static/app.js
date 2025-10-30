const rewriteBtn = document.getElementById('rewriteBtn');
const textInput = document.getElementById('text_input');
const micButton = document.getElementById('micButton');
const micStatus = document.getElementById('micStatus');
const modeSelect = document.getElementById('mode');
const languageSelect = document.getElementById('language');

const plagiarismCheck = document.getElementById('plagiarism_check');
const grammarCheck = document.getElementById('grammar_check');
const showReadability = document.getElementById('show_readability');
const summarizeOption = document.getElementById('summarize_option');
const expandOption = document.getElementById('expand_option');
const results = document.getElementById('results');
const rewrittenOutput = document.getElementById('rewritten_output');
const extraChecks = document.getElementById('extraChecks');
if (rewriteBtn) {
  rewriteBtn.addEventListener('click', async () => {
  const text = textInput.value.trim();
  if (!text) {
    alert('Please enter some text first!');
    return;
  }

  rewriteBtn.disabled = true;
  rewriteBtn.textContent = '⏳ Rewriting...';

  results.style.display = 'none';
  extraChecks.innerHTML = '';
  rewrittenOutput.value = '';

  const payload = {
    text,
    mode: modeSelect.value,
    language: languageSelect.value,

    plagiarism_check: plagiarismCheck.checked,
    grammar_check: grammarCheck.checked,
    show_readability: showReadability.checked,
    summarize_option: summarizeOption.checked,
    expand_option: expandOption.checked
  };

  try {
    const res = await fetch('/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Server error');
    }

    rewrittenOutput.value = data.rewritten || '';
    results.style.display = 'block';

    if (data.grammar) {
      const g = data.grammar;
      const div = document.createElement('div');
      div.className = 'extra-section';
      if (g.count === 0) {
        div.innerHTML = `<h4>🧩 Grammar Check</h4><p>✅ No grammar issues found!</p>`;
      } else {
        let list = '<ul>' + g.matches.map(m => `<li>${m.message || 'Issue'}</li>`).join('') + '</ul>';
        div.innerHTML = `<h4>🧩 Grammar Check</h4><p>⚠ Found ${g.count} potential grammar issue(s).</p>${list}`;
      }
      extraChecks.appendChild(div);
    }

    if (data.readability !== undefined) {
      const div = document.createElement('div');
      div.className = 'extra-section';
      if (data.readability === null) {
        div.innerHTML = `<h4>📚 Readability Score</h4><p>ℹ Readability library not available — skipping score.</p>`;
      } else {
        div.innerHTML = `<h4>📚 Readability Score</h4><p>Flesch–Kincaid: <strong>${data.readability.toFixed(2)}</strong></p>`;
      }
      extraChecks.appendChild(div);
    }

    if (data.summary !== undefined) {
      const div = document.createElement('div');
      div.className = 'extra-section';
      if (data.summary === null) {
        div.innerHTML = `<h4>🧾 Summary</h4><p>⚠️ Error generating summary. Please try again.</p>`;
      } else {
        div.innerHTML = `<h4>🧾 Summary</h4><pre>${escapeHtml(data.summary)}</pre>`;
      }
      extraChecks.appendChild(div);
    }

    if (data.expansion) {
      const div = document.createElement('div');
      div.className = 'extra-section';
      div.innerHTML = `<h4>🔍 Expanded Version</h4><pre>${escapeHtml(data.expansion)}</pre>`;
      extraChecks.appendChild(div);
    }

    if (data.plagiarism !== undefined) {
      const div = document.createElement('div');
      div.className = 'extra-section';
      div.innerHTML = `<h4>🧠 Plagiarism (Sim)</h4><p>Estimated: <strong>${data.plagiarism}%</strong></p>`;
      extraChecks.appendChild(div);
    }

  } catch (err) {
    alert('Error: ' + err.message);
    console.error(err);
    } finally {
      rewriteBtn.disabled = false;
      rewriteBtn.textContent = '🚀 Rewrite';
    }
  });
}



// Voice input for editor
if (micButton && micStatus) {
  let recognizing = false;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    micButton.disabled = true;
    micStatus.textContent = 'Speech recognition not supported in this browser.';
  } else {
    const recog = new SpeechRecognition();
    recog.lang = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    recog.continuous = true; // Allow for longer speech input

    recog.onstart = () => {
      recognizing = true;
      micButton.classList.add('recording');
      micButton.querySelector('.text').textContent = 'Stop';
      micStatus.textContent = 'Listening — speak clearly...';
    };

    recog.onerror = (e) => {
      console.error('Speech error', e);
      recognizing = false;
      micButton.classList.remove('recording');
      micButton.querySelector('.text').textContent = 'Speak';
      micStatus.textContent = 'Error during speech recognition.';
    };

    recog.onend = () => {
      recognizing = false;
      micButton.classList.remove('recording');
      micButton.querySelector('.text').textContent = 'Speak';
      micStatus.textContent = 'Click the mic button to start speaking';
    };

    recog.onresult = (evt) => {
      const text = Array.from(evt.results).map(r => r[0].transcript).join(' ');
      // Append to existing text instead of replacing
      const cursorPos = textInput.selectionStart;
      const currentText = textInput.value;
      const beforeCursor = currentText.substring(0, cursorPos);
      const afterCursor = currentText.substring(cursorPos);
      
      // Add space if needed
      const separator = beforeCursor.length > 0 && !beforeCursor.endsWith(' ') ? ' ' : '';
      
      textInput.value = beforeCursor + separator + text + afterCursor;
      // Update cursor position
      const newPos = cursorPos + separator.length + text.length;
      textInput.setSelectionRange(newPos, newPos);
      textInput.focus();
      
      micStatus.textContent = 'Text added: "' + text.slice(0, 60) + (text.length > 60 ? '...' : '') + '"';
    };

    micButton.addEventListener('click', () => {
      if (!recognizing) {
        try { recog.start(); } catch (e) { console.warn(e); }
      } else {
        recog.stop();
      }
    });
  }
}

// If we're on the dashboard, prefill the editor from sessionStorage (if available)
if (textInput) {
  try {
    const pre = sessionStorage.getItem('prefillText');
    if (pre && pre.trim().length > 0) {
      textInput.value = pre;
      // clear it after reading
      try { sessionStorage.removeItem('prefillText'); } catch (e) {}
    }
  } catch (e) { /* ignore storage errors */ }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl/Cmd + Enter to trigger rewrite
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (rewriteBtn) rewriteBtn.click();
  }
  
  // Ctrl/Cmd + M to toggle microphone
  if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
    e.preventDefault();
    if (micButton) {
      micButton.click();
    }
  }

  // Ctrl/Cmd + J to switch between input and output
  if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
    e.preventDefault();
    if (textInput && rewrittenOutput) {
      if (document.activeElement === textInput) {
        rewrittenOutput.focus();
      } else {
        textInput.focus();
      }
    }
  }

  // Escape to stop recording if active
  if (e.key === 'Escape' && micButton) {
    const isRecording = micButton.classList.contains('recording');
    if (isRecording) {
      micButton.click();
    }
  }
});

// Show keyboard shortcuts in micStatus tooltip
if (micButton) {
  const shortcuts = [
    'Ctrl+Enter: Rewrite text',
    'Ctrl+M: Toggle microphone',
    'Ctrl+J: Switch input/output',
    'Ctrl+B: Bold text',
    'Ctrl+I: Italic text',
    'Ctrl+U: Bullet points',
    'Ctrl+Q: Quote text',
    'Ctrl+H: Add heading',
    'Esc: Stop recording'
  ].join('\n');
  micButton.title = `Click to start/stop voice input\n\nKeyboard Shortcuts:\n${shortcuts}`;
}

// Text formatting functionality
const formatButtons = document.querySelectorAll('.format-btn');
if (formatButtons.length > 0) {
  const formatMap = {
    bold: {
      prefix: '**',
      suffix: '**',
      placeholder: 'bold text',
      shortcut: 'b'
    },
    italic: {
      prefix: '_',
      suffix: '_',
      placeholder: 'italic text',
      shortcut: 'i'
    },
    bullet: {
      prefix: '- ',
      suffix: '',
      multiline: true,
      placeholder: 'list item',
      shortcut: 'u'
    },
    quote: {
      prefix: '> ',
      suffix: '',
      multiline: true,
      placeholder: 'quoted text',
      shortcut: 'q'
    },
    heading: {
      prefix: '## ',
      suffix: '',
      placeholder: 'heading',
      shortcut: 'h'
    }
  };

  // Format selected text or insert placeholder
  function formatText(format) {
    const {prefix, suffix, multiline, placeholder} = formatMap[format];
    const start = textInput.selectionStart;
    const end = textInput.selectionEnd;
    const selected = textInput.value.substring(start, end);
    
    let replacement;
    if (selected) {
      if (multiline) {
        // Format each line for multiline formats
        replacement = selected.split('\n')
          .map(line => prefix + line)
          .join('\n');
      } else {
        replacement = prefix + selected + suffix;
      }
    } else {
      replacement = prefix + placeholder + suffix;
    }
    
    textInput.focus();
    document.execCommand('insertText', false, replacement);
    
    // Update selection to cover new text
    const newStart = start;
    const newEnd = start + replacement.length;
    textInput.setSelectionRange(newStart, newEnd);
  }

  // Add click handlers to format buttons
  formatButtons.forEach(btn => {
    const format = btn.dataset.format;
    btn.addEventListener('click', () => formatText(format));
  });

  // Add keyboard shortcuts for formatting
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
      for (const [format, config] of Object.entries(formatMap)) {
        if (e.key.toLowerCase() === config.shortcut) {
          e.preventDefault();
          formatText(format);
          break;
        }
      }
    }
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
