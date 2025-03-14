        const englishToSga = {
            'a': 'ᔑ', 'b': 'ʖ', 'c': 'ᓵ', 'd': '↸', 'e': 'ᒷ', 'f': '⎓', 'g': '⊣', 'h': '⍑',
            'i': '╎', 'j': '⋮', 'k': 'ꖌ', 'l': 'ꖎ', 'm': 'ᒲ', 'n': 'リ', 'o': '𝙹', 'p': '!¡',
            'q': 'ᑑ', 'r': '∷', 's': 'ᓭ', 't': 'ℸ̣', 'u': '⚍', 'v': '⍊', 'w': '∴', 'x': '̇/',
            'y': '||', 'z': '⨅'
        };

        const sgaToEnglish = Object.fromEntries(
            Object.entries(englishToSga).map(([k, v]) => [v, k])
        );

        let consoleOutput = "Welcome to the SGA Translator Console!\n";
        let currentTranslation = "";

        function toggleKeyboard() {
            const keyboard = document.getElementById('keyboard');
            keyboard.style.display = keyboard.style.display === 'none' ? 'grid' : 'none';
        }

        function addCharacter(character) {
            const inputField = document.getElementById('input');
            if (character === ' ') {
                inputField.value += '  ';  // Insert two spaces for the space button
            } else {
                inputField.value += character + ' ';  // Insert space after each character
            }
        }

        function translateToSga(text) {
            let sgaText = text.split('').map(char => {
                if (char === ' ') {
                    return '   ';
                }
                if (char === char.toUpperCase() && char !== ' ' && /[a-zA-Z]/.test(char)) {
                    return `^${englishToSga[char.toLowerCase()] || char}`;
                }
                return englishToSga[char] || char;
            }).join(' ');

            sgaText = sgaText.replace(/     /g, '   ');
            return sgaText;
        }

        function translateToEnglish(sgaText) {
            return sgaText.split('   ').map(section => {
                return section.split(' ').map(char => {
                    if (char.startsWith('^')) {
                        return sgaToEnglish[char.slice(1)]?.toUpperCase() || char;
                    }
                    return sgaToEnglish[char] || char;
                }).join('');
            }).join(' ');
        }

        function handleInput(event) {
            const inputText = event.target.value;
            const consoleElement = document.getElementById('console');
            let response = "";

            if (inputText.startsWith("1")) {
                const textToTranslate = inputText.slice(2);
                currentTranslation = translateToSga(textToTranslate);
                response = `Translated to SGA: ${currentTranslation}\n`;
            } else if (inputText.startsWith("2")) {
                const textToTranslate = inputText.slice(2);
                currentTranslation = translateToEnglish(textToTranslate);
                response = `Translated to English: ${currentTranslation}\n`;
            } else {
                response = "Invalid command. Type '1 <text>' to translate to SGA or '2 <text>' to translate to English.\n";
            }

            consoleOutput += response;
            consoleElement.textContent = consoleOutput;
            event.target.value = "";
        }

        function copyToClipboard() {
            navigator.clipboard.writeText(currentTranslation).then(() => {
                alert('Translation copied!');
            });
        }

        document.getElementById('input').addEventListener('keydown', function(event) {
            if (event.key === "Enter") {
                handleInput(event);
            }
        });
