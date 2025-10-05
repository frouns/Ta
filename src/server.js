const http = require('http');
const { randomUUID } = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

// --- Helper Functions ---

const readDB = async () => {
    try {
        const dbJson = await fs.readFile(DB_PATH, 'utf-8');
        return JSON.parse(dbJson);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const initialDb = { notes: {} };
            await writeDB(initialDb);
            return initialDb;
        }
        throw error;
    }
};

const writeDB = async (data) => {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
};

const parseBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => resolve(JSON.parse(body)));
        req.on('error', err => reject(err));
    });
};

const sendResponse = (res, statusCode, body) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
};

// --- Bi-directional Linking Logic ---
const LINK_REGEX = /\[\[([a-fA-F0-9-]+)\]\]/g;

const parseLinks = (content) => {
    const links = new Set();
    let match;
    while ((match = LINK_REGEX.exec(content)) !== null) {
        links.add(match[1]);
    }
    return Array.from(links);
};

const updateLinks = async (noteId, newContent, db) => {
    const note = db.notes[noteId];
    if (!note) return;

    const oldLinks = new Set(note.links);
    const newLinks = new Set(parseLinks(newContent));

    // Remove old backlinks
    const toRemove = [...oldLinks].filter(id => !newLinks.has(id));
    for (const targetId of toRemove) {
        if (db.notes[targetId]) {
            db.notes[targetId].backlinks = db.notes[targetId].backlinks.filter(id => id !== noteId);
        }
    }

    // Add new backlinks
    const toAdd = [...newLinks].filter(id => !oldLinks.has(id));
    for (const targetId of toAdd) {
        if (db.notes[targetId] && targetId !== noteId) {
            if (!db.notes[targetId].backlinks.includes(noteId)) {
                db.notes[targetId].backlinks.push(noteId);
            }
        }
    }
    note.links = Array.from(newLinks);
};


// --- Request Handler ---

const server = http.createServer(async (req, res) => {
    const { method, url } = req;
    const urlParts = url.split('/');

    try {
        const db = await readDB();

        // --- Template CRUD Endpoints ---

        // Create a new template
        if (method === 'POST' && url === '/api/templates') {
            const { title, content } = await parseBody(req);
            if (!title || !content) {
                return sendResponse(res, 400, { message: 'Template title and content are required.' });
            }
            const id = randomUUID();
            const newTemplate = { id, title, content };
            db.templates[id] = newTemplate;
            await writeDB(db);
            return sendResponse(res, 201, newTemplate);
        }

        // Get all templates
        if (method === 'GET' && url === '/api/templates') {
            return sendResponse(res, 200, Object.values(db.templates));
        }

        // Get a single template by ID
        if (method === 'GET' && url.startsWith('/api/templates/')) {
            const id = urlParts[3];
            const template = db.templates[id];
            return template ? sendResponse(res, 200, template) : sendResponse(res, 404, { message: 'Template not found.' });
        }

        // Update a template
        if (method === 'PUT' && url.startsWith('/api/templates/')) {
            const id = urlParts[3];
            if (!db.templates[id]) {
                return sendResponse(res, 404, { message: 'Template not found.' });
            }
            const { title, content } = await parseBody(req);
            db.templates[id].title = title || db.templates[id].title;
            db.templates[id].content = content || db.templates[id].content;
            await writeDB(db);
            return sendResponse(res, 200, db.templates[id]);
        }

        // Delete a template
        if (method === 'DELETE' && url.startsWith('/api/templates/')) {
            const id = urlParts[3];
            if (!db.templates[id]) {
                return sendResponse(res, 404, { message: 'Template not found.' });
            }
            delete db.templates[id];
            await writeDB(db);
            res.writeHead(204);
            return res.end();
        }


        // --- Note Endpoints ---

        // Route: GET /api/notes
        if (method === 'GET' && url === '/api/notes') {
            return sendResponse(res, 200, Object.values(db.notes));
        }

        // --- Daily Note Feature ---
        if (method === 'GET' && url === '/api/notes/daily') {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const dailyNoteTitle = `Daily Note: ${today}`;

            let dailyNote = Object.values(db.notes).find(note => note.title === dailyNoteTitle);

            if (dailyNote) {
                return sendResponse(res, 200, dailyNote);
            } else {
                // Create a new daily note if it doesn't exist
                const id = randomUUID();
                dailyNote = {
                    id,
                    title: dailyNoteTitle,
                    content: `# ${today}\n\n`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    links: [],
                    backlinks: []
                };
                db.notes[id] = dailyNote;
                await writeDB(db);
                return sendResponse(res, 201, dailyNote);
            }
        }

        // Route: GET /api/notes/:id
        if (method === 'GET' && url.startsWith('/api/notes/')) {
            const id = urlParts[3];
            const note = db.notes[id];
            return note ? sendResponse(res, 200, note) : sendResponse(res, 404, { message: 'Note not found.' });
        }

        // Route: POST /api/notes (with template support)
        if (method === 'POST' && url === '/api/notes') {
            const { title, content, templateId } = await parseBody(req);
            if (!title) {
                return sendResponse(res, 400, { message: 'Title is required.' });
            }

            let noteContent = content || '';
            if (templateId) {
                const template = db.templates[templateId];
                if (template) {
                    noteContent = template.content; // Apply template content
                } else {
                    return sendResponse(res, 404, { message: 'Template not found.' });
                }
            }

            if (!noteContent && !content) {
                return sendResponse(res, 400, { message: 'Content is required if not using a template.' });
            }

            const id = randomUUID();
            const newNote = {
                id,
                title,
                content: noteContent,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                links: [],
                backlinks: []
            };
            db.notes[id] = newNote;
            await updateLinks(id, noteContent, db); // Parse links from template content
            await writeDB(db);
            return sendResponse(res, 201, newNote);
        }

        // Route: PUT /api/notes/:id
        if (method === 'PUT' && url.startsWith('/api/notes/')) {
            const id = urlParts[3];
            const note = db.notes[id];
            if (!note) {
                return sendResponse(res, 404, { message: 'Note not found.' });
            }
            const { title, content } = await parseBody(req);
            note.title = title || note.title;
            const newContent = content || note.content;

            if (content) {
                await updateLinks(id, newContent, db);
            }
            note.content = newContent;
            note.updatedAt = new Date().toISOString();

            await writeDB(db);
            return sendResponse(res, 200, note);
        }

        // Route: DELETE /api/notes/:id
        if (method === 'DELETE' && url.startsWith('/api/notes/')) {
            const id = urlParts[3];
            const noteToDelete = db.notes[id];
            if (!noteToDelete) {
                return sendResponse(res, 404, { message: 'Note not found.' });
            }
            // Clean up backlinks referring to this note
            for (const backlinkId of noteToDelete.backlinks) {
                if (db.notes[backlinkId]) {
                    db.notes[backlinkId].links = db.notes[backlinkId].links.filter(linkId => linkId !== id);
                }
            }
            delete db.notes[id];
            await writeDB(db);
            res.writeHead(204);
            return res.end();
        }

        // Not Found
        sendResponse(res, 404, { message: 'Endpoint not found.' });

    } catch (error) {
        console.error('Server Error:', error);
        sendResponse(res, 500, { message: 'Internal Server Error' });
    }
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});