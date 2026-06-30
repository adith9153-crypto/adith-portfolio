/* ==========================================================================
   CYBERPUNK HUD INTERACTION CONTROLLER (script.js)
   Logic, terminal emulator, audio synthesizer, and interactive animations
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. STATE & GLOBAL VARIABLES
    const state = {
        isSoundEnabled: false,
        isCrtEnabled: true,
        audioContext: null
    };

    // DOM Selectors
    const clockElement = document.getElementById('system-clock');
    const btnSound = document.getElementById('btn-sound');
    const btnScanlines = document.getElementById('btn-scanlines');
    
    // Terminal Selectors
    const terminalForm = document.getElementById('terminal-form');
    const terminalInput = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output-container');
    const terminalScreen = document.getElementById('terminal-screen');

    // Contact Form & Modal Selectors
    const uplinkForm = document.getElementById('uplink-form');
    const successModal = document.getElementById('uplink-success-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');

    // 2. HUD SYSTEM UPTIME CLOCK
    function updateClock() {
        const now = new Date();
        const hours = String(now.getUTCHours()).padStart(2, '0');
        const minutes = String(now.getUTCMinutes()).padStart(2, '0');
        const seconds = String(now.getUTCSeconds()).padStart(2, '0');
        clockElement.textContent = `${hours}:${minutes}:${seconds} UTC`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // 3. WEB AUDIO SYNTHESIS ENGINE
    // We synthesise sound effects programmatically to maintain zero dependencies and high performance
    function initAudio() {
        if (!state.audioContext) {
            state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (state.audioContext.state === 'suspended') {
            state.audioContext.resume();
        }
    }

    function playTone(freq, type, duration, volume) {
        if (!state.isSoundEnabled) return;
        
        try {
            initAudio();
            const ctx = state.audioContext;
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            // Envelope
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn("Audio Context playback failed: ", e);
        }
    }

    // Interactive Sound Presets
    const sounds = {
        hover: () => playTone(880, 'sine', 0.08, 0.02),
        click: () => {
            playTone(1046.50, 'triangle', 0.15, 0.05); // C6
            setTimeout(() => playTone(1318.51, 'triangle', 0.15, 0.05), 50); // E6
        },
        keystroke: () => {
            const pitch = 300 + Math.random() * 200;
            playTone(pitch, 'triangle', 0.03, 0.02);
        },
        success: () => {
            playTone(523.25, 'sine', 0.2, 0.08); // C5
            setTimeout(() => playTone(659.25, 'sine', 0.2, 0.08), 80); // E5
            setTimeout(() => playTone(783.99, 'sine', 0.2, 0.08), 160); // G5
            setTimeout(() => playTone(1046.50, 'sine', 0.3, 0.1), 240); // C6
        },
        error: () => {
            playTone(180, 'sawtooth', 0.25, 0.08);
            setTimeout(() => playTone(150, 'sawtooth', 0.35, 0.08), 100);
        },
        scan: () => {
            // Frequency sweep sound
            try {
                initAudio();
                const ctx = state.audioContext;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.8);
                
                gain.gain.setValueAtTime(0.04, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.8);
                
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.8);
            } catch(e){}
        }
    };

    // Attach Hover sound to UI elements
    function attachSoundsToElements() {
        const interactiveElements = document.querySelectorAll('button, a, .chip, .project-card, input, textarea');
        interactiveElements.forEach(el => {
            // Prevent duplicated event handlers
            if (el.dataset.soundAttached) return;
            
            el.addEventListener('mouseenter', sounds.hover);
            
            if (el.tagName === 'BUTTON' || el.tagName === 'A' || el.classList.contains('project-card')) {
                el.addEventListener('click', sounds.click);
            }
            
            el.dataset.soundAttached = 'true';
        });
    }

    // 4. PREFERENCES (CRT & SOUND)
    // Load from local storage
    if (localStorage.getItem('crt_disabled') === 'true') {
        document.body.classList.remove('crt-enabled', 'scanlines-enabled');
        btnScanlines.classList.remove('active');
        btnScanlines.querySelector('span').textContent = 'CRT: OFF';
        state.isCrtEnabled = false;
    }
    
    if (localStorage.getItem('sound_enabled') === 'true') {
        state.isSoundEnabled = true;
        btnSound.classList.add('active');
        btnSound.querySelector('i').className = 'fa-solid fa-volume-high text-cyan';
        btnSound.querySelector('span').textContent = 'SOUND: ON';
    }

    // Toggle Scanlines & CRT Filter
    btnScanlines.addEventListener('click', () => {
        state.isCrtEnabled = !state.isCrtEnabled;
        if (state.isCrtEnabled) {
            document.body.classList.add('crt-enabled', 'scanlines-enabled');
            btnScanlines.classList.add('active');
            btnScanlines.querySelector('span').textContent = 'CRT: ON';
            localStorage.setItem('crt_disabled', 'false');
        } else {
            document.body.classList.remove('crt-enabled', 'scanlines-enabled');
            btnScanlines.classList.remove('active');
            btnScanlines.querySelector('span').textContent = 'CRT: OFF';
            localStorage.setItem('crt_disabled', 'true');
        }
    });

    // Toggle Sound
    btnSound.addEventListener('click', () => {
        state.isSoundEnabled = !state.isSoundEnabled;
        initAudio();
        
        if (state.isSoundEnabled) {
            btnSound.classList.add('active');
            btnSound.querySelector('i').className = 'fa-solid fa-volume-high text-cyan';
            btnSound.querySelector('span').textContent = 'SOUND: ON';
            localStorage.setItem('sound_enabled', 'true');
            sounds.click();
        } else {
            btnSound.classList.remove('active');
            btnSound.querySelector('i').className = 'fa-solid fa-volume-xmark';
            btnSound.querySelector('span').textContent = 'SOUND: OFF';
            localStorage.setItem('sound_enabled', 'false');
        }
    });

    // Resume audio on document click (required for modern browser sound policies)
    document.addEventListener('click', initAudio, { once: true });

    // 5. HACKER TERMINAL EMULATOR
    
    // Auto-scroll helper
    function scrollTerminal() {
        terminalScreen.scrollTop = terminalScreen.scrollHeight;
    }

    // Sound effect on key input
    terminalInput.addEventListener('keypress', (e) => {
        if (e.key !== 'Enter') {
            sounds.keystroke();
        }
    });

    // Focus input on terminal box click
    terminalScreen.addEventListener('click', () => {
        terminalInput.focus();
    });

    // Write line to terminal
    function writeLine(text, className = '') {
        const line = document.createElement('div');
        line.className = `terminal-line ${className}`;
        line.innerHTML = text;
        terminalOutput.appendChild(line);
        scrollTerminal();
    }

    // Typewriter effect write (useful for mock scan alerts)
    function writeSlowLines(linesArray, index = 0, speed = 80, callback = null) {
        if (index < linesArray.length) {
            writeLine(linesArray[index].text, linesArray[index].class || '');
            if (state.isSoundEnabled && linesArray[index].sound) {
                linesArray[index].sound();
            }
            setTimeout(() => {
                writeSlowLines(linesArray, index + 1, speed, callback);
            }, speed);
        } else if (callback) {
            callback();
        }
    }

    // Available commands mapping
    const commands = {
        help: () => {
            writeLine('--- DECRYPTED CHANNELS AVAILABLE ---', 'text-magenta');
            writeLine('about          Display professional credentials summary');
            writeLine('skills         Query technical cyber competencies & tools');
            writeLine('projects       Read system engineering project reports');
            writeLine('certs          Verify active industry certifications');
            writeLine('contact        Establish comm link protocols');
            writeLine('hack           [WARNING] Execute system diagnostic spoof');
            writeLine('clear          Flush terminal display buffer');
            writeLine('help           Query this help directory');
        },
        clear: () => {
            terminalOutput.innerHTML = '';
        },
        about: () => {
            writeLine('>> ACCESSING FILE: ADITH_SHAJI.SUMMARY.txt', 'text-cyan');
            writeLine('Adith Shaji is an India-based Cybersecurity Analyst & VAPT Engineer.');
            writeLine('Expertise lies in testing web applications, vulnerability management,');
            writeLine('bug bounty research, and developing low-level security test scripts.');
            writeLine('Uplink status: Active and open to professional opportunities.');
        },
        skills: () => {
            writeLine('>> INTEL DIRECTORY: Competencies Matrix', 'text-yellow');
            writeLine('Security VAPT: Web Application Security, OWASP Top 10, Wireless Testing, Bug Bounty');
            writeLine('Toolbox      : Burp Suite, Nmap, SQLMap, WPScan, Nuclei, Nikto, Kali Linux');
            writeLine('Programming  : Python (Network sockets, scripting), Random Forest ML');
            writeLine('Networking   : TCP/IP Stack, Threat Detection, Traffic Logs Analysis');
        },
        projects: () => {
            writeLine('>> PROJECT REGISTRIES DECRYPTED:', 'text-cyan');
            writeLine('- Broadcom OTP Bypass     : Auth bypass vulnerability responsibly disclosed.');
            writeLine('- Network NIDS            : Python packets sniffing anomaly detector (AI-powered).');
            writeLine('- WiFi Deauther Board     : Embedded ESP8266 wireless assessment console.');
            writeLine('- Custom CTF Lab          : Designed vulnerable simulation environment for TryHackMe.');
            writeLine('- NetHunter Terminal      : Rooted LineageOS portable pentesting machine.');
            writeLine('- Bug Bounty Logs         : SQLi, XSS discoveries disclosed internationally.');
        },
        certs: () => {
            writeLine('>> CREDENTIAL CHECKLIST:', 'text-yellow');
            writeLine('[1] TCS Advanced Cyber Security Certification - VALIDATED');
            writeLine('[2] Bachelor of Computer Applications Degree - VALIDATED');
        },
        contact: () => {
            writeLine('>> SECURITY COMMUNICATIONS LINE ACTIVE:', 'text-magenta');
            writeLine('Secure Email  : <a href="mailto:adith9153@gmail.com" class="text-cyan">adith9153@gmail.com</a>');
            writeLine('LinkedIn Node : <a href="https://www.linkedin.com/in/adithshaji" target="_blank" class="text-cyan">linkedin.com/in/adithshaji</a>');
            writeLine('Use the SECURE UPLINK panel at the bottom right for instantaneous packets.');
        },
        hack: () => {
            sounds.scan();
            const alertPayload = [
                { text: '[*] INITIALIZING RETICULAR INTRUSION SCAN...', class: 'text-yellow' },
                { text: '[*] Establishing route through Kannur, Kerala proxy logs...', class: 'text-dim' },
                { text: '[+] Connected: Port 22 SSH (Host: localhost)', class: 'text-green' },
                { text: '[!] EXPLOITING OWASP BUFFER MISCONFIGURATION...', class: 'text-yellow' },
                { text: '[!] Injecting payload: OTP_Authentication_Bypass.py', class: 'text-magenta', sound: sounds.keystroke },
                { text: '..........................................................', class: 'text-dim' },
                { text: '[SUCCESS] HASH MATCH: AdithShaji{v4pt_sp3c14l1st}', class: 'text-green', sound: sounds.success },
                { text: '>> INTRUSION Spoof complete. Hello Cyberpunk!', class: 'text-cyan' }
            ];
            // Disable input while hacking
            terminalInput.disabled = true;
            writeSlowLines(alertPayload, 0, 150, () => {
                terminalInput.disabled = false;
                terminalInput.focus();
            });
        }
    };

    // Terminal command executor
    terminalForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const rawInput = terminalInput.value;
        const cmd = rawInput.trim().toLowerCase();
        
        // Print typed command line
        writeLine(`guest@adithshaji:~$ ${rawInput}`, 'text-light');
        
        if (cmd) {
            if (commands[cmd]) {
                commands[cmd]();
                if (cmd !== 'hack') {
                    sounds.click();
                }
            } else {
                sounds.error();
                writeLine(`[-] SYSTEM ERROR: Command '${cmd}' not recognized. Type 'help' for directory channels.`, 'text-red');
            }
        }
        
        terminalInput.value = '';
        scrollTerminal();
    });

    // 6. CONTACT FORM SECURE TELEMETRY TRANSMISSION
    uplinkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const sender = document.getElementById('form-sender').value;
        const email = document.getElementById('form-email').value;
        const message = document.getElementById('form-message').value;

        // Custom console log trace animation on transmission
        console.log(`%c[UPLINK INIT] Sender: ${sender} | Email: ${email}`, 'color: #ff0055; font-weight: bold;');
        console.log(`%c[UPLINK PACKET] Payload: ${message}`, 'color: #00f0ff;');

        // Play sounds
        sounds.scan();

        // Simulate network delay for transmission packet
        const submitBtn = uplinkForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> TRANSMITTING PACKETS...';

        setTimeout(() => {
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            
            // Play success chirp
            sounds.success();

            // Display HUD telemetry success overlay modal
            successModal.classList.remove('hidden');
            
            // Reset form
            uplinkForm.reset();
        }, 1500);
    });

    // Close Modal Button
    closeModalBtn.addEventListener('click', () => {
        sounds.click();
        successModal.classList.add('hidden');
    });

    // Close modal on click outside content
    successModal.addEventListener('click', (e) => {
        if (e.target === successModal) {
            sounds.click();
            successModal.classList.add('hidden');
        }
    });

    // 7. PAGE SCROLL SMOOTH SOUND CHIME & INITIALIZATION
    // Initialize hover sounds for current page elements
    attachSoundsToElements();

    // Re-check sounds if new components or DOM modifications happen (just in case)
    const observer = new MutationObserver(() => {
        attachSoundsToElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });
});
