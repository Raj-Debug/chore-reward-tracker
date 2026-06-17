const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
require('dotenv').config();

const User = require('./models/users');
const Chore = require('./models/chores');
const Reward = require('./models/rewards');

const app = express();
const PORT = process.env.PORT || 5000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// =============================================
// HOME PAGE - Renders the full dashboard
// =============================================
app.get('/', async (req, res) => {
    try {
        const users = await User.find();
        const chores = await Chore.find().populate('assignedTo').populate('completedBy');
        const rewards = await Reward.find();

        // Which family member is currently "logged in"
        const activeUserId = req.query.activeUser || (users[0] ? users[0]._id.toString() : null);
        const activeUser = users.find(u => u._id.toString() === activeUserId) || null;

        res.render('index', { users, chores, rewards, activeUser });
    } catch (err) {
        res.status(500).send('Error loading dashboard: ' + err.message);
    }
});

// =============================================
// USER ROUTES
// =============================================

// Add a new family member
app.post('/api/users', async (req, res) => {
    try {
        const { name, avatar } = req.body;
        const newUser = new User({ name, avatar });
        await newUser.save();
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error adding member: ' + err.message);
    }
});

// =============================================
// CHORE ROUTES
// =============================================

// Create a new chore
app.post('/api/chores', async (req, res) => {
    try {
        const { title, description, points, assignedTo } = req.body;
        const newChore = new Chore({
            title,
            description,
            points,
            assignedTo: assignedTo || null
        });
        await newChore.save();
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error creating chore: ' + err.message);
    }
});

// Mark a chore as completed
app.post('/api/chores/:id/complete', async (req, res) => {
    try {
        const chore = await Chore.findById(req.params.id);
        if (!chore) return res.status(404).send('Chore not found');

        chore.status = 'completed';
        chore.completedBy = req.body.activeUser || null;
        await chore.save();

        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error completing chore: ' + err.message);
    }
});

// Approve a completed chore (awards points to the user who completed it)
app.post('/api/chores/:id/approve', async (req, res) => {
    try {
        const chore = await Chore.findById(req.params.id);
        if (!chore) return res.status(404).send('Chore not found');

        chore.status = 'approved';
        await chore.save();

        // Award points to the user who completed it
        if (chore.completedBy) {
            await User.findByIdAndUpdate(chore.completedBy, {
                $inc: { points: chore.points }
            });
        }

        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error approving chore: ' + err.message);
    }
});

// Delete a chore
app.post('/api/chores/:id/delete', async (req, res) => {
    try {
        await Chore.findByIdAndDelete(req.params.id);
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error deleting chore: ' + err.message);
    }
});

// =============================================
// REWARD ROUTES
// =============================================

// Create a new reward
app.post('/api/rewards', async (req, res) => {
    try {
        const { title, description, cost, stock } = req.body;
        const newReward = new Reward({
            title,
            description,
            cost,
            stock: stock || -1
        });
        await newReward.save();
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error creating reward: ' + err.message);
    }
});

// Redeem a reward (spend points)
app.post('/api/rewards/:id/redeem', async (req, res) => {
    try {
        const reward = await Reward.findById(req.params.id);
        if (!reward) return res.status(404).send('Reward not found');

        const user = await User.findById(req.body.activeUser);
        if (!user) return res.status(400).send('No active user selected');

        // Check if user has enough points
        if (user.points < reward.cost) {
            return res.redirect('/');
        }

        // Check stock
        if (reward.stock === 0) {
            return res.redirect('/');
        }

        // Deduct points and update spent points
        user.points -= reward.cost;
        user.spentPoints += reward.cost;
        await user.save();

        // Reduce stock if not infinite (-1 means infinite)
        if (reward.stock > 0) {
            reward.stock -= 1;
            await reward.save();
        }

        res.redirect('/');
    } catch (err) {
        res.status(500).send('Error redeeming reward: ' + err.message);
    }
});

// =============================================
// DATABASE CONNECTION & START SERVER
// =============================================
async function startServer() {
    try {
        console.log("Mongo URI exists:", !!process.env.MONGODB_URI);

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("Successfully connected to MongoDB.");

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (err) {
        console.error("Database connection error:");
        console.error(err);
        process.exit(1);
    }
}

startServer();
