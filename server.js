const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Explicit route handler for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const RESULT_URL = "https://results.cmrithyderabad.edu.in/helper.php?gamaOne=getResult";

const BATCH_SEMESTERS = {
    "2021": {
        "Semester 1": "14",
        "Semester 2": "15",
        "Semester 3": "16",
        "Semester 4": "4",
        "Semester 5": "23",
        "Semester 6": "42",
        "Semester 7": "63"
    },
    "2022": {
        "Semester 1": "1",
        "Semester 2": "12",
        "Semester 3": "30",
        "Semester 4": "49",
        "Semester 5": "65"
    },
    "2023": {
        "Semester 1": "24",
        "Semester 2": "44",
        "Semester 3": "64"
    }
};

async function fetchSGPA(roll, resultCode) {
    try {
        const params = new URLSearchParams({ hallticket: roll, result: resultCode });
        const response = await axios.post(RESULT_URL, params);
        const $ = cheerio.load(response.data);
        return $('div[data-title="SGPA"]').first().text().trim() || '-';
    } catch (error) {
        console.error(`Error fetching SGPA: ${error.message}`);
        return '-';
    }
}

app.post('/api/calculate', async (req, res) => {
    const { roll, batch } = req.body;
    if (!roll) return res.status(400).json({ error: "Roll number required" });
    if (!batch) return res.status(400).json({ error: "Batch selection required" });

    if (!BATCH_SEMESTERS[batch]) {
        return res.status(400).json({ error: "Invalid batch selected" });
    }

    const semResults = {};
    for (const [sem, code] of Object.entries(BATCH_SEMESTERS[batch])) {
        semResults[sem] = await fetchSGPA(roll, code);
    }

    let cgpa = "";
    if (Object.values(semResults).some(sgpa => sgpa === '-' || sgpa === '')) {
        cgpa = "Incomplete data";
    } else {
        try {
            const total = Object.values(semResults).reduce((sum, sgpa) => sum + parseFloat(sgpa), 0);
            cgpa = (total / Object.values(semResults).length).toFixed(2);
        } catch {
            cgpa = "Error calculating CGPA";
        }
    }

    res.json({ roll, batch, semResults, cgpa });
});

// Start the server if we're not in a Vercel environment
if (process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;