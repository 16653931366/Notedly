const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { AuthenticationError, ForbiddenError } = require('apollo-server-express');
const mongoose = require('mongoose');
require('dotenv').config();
const { DateTimeResolver } = require('graphql-scalars');

const resolvers = {

	Query: {
		notes: async (parent, args, { models }) => {
	        return await models.Note.find();
	    },
	    note: async (parent, args, { models }) => {
	        return await models.Note.findById(args.id);
	    },
	    user: async (parent, { username }, {models}) => {
	        return await models.User.findOne({username});
	    },
	    users: async (parent, args, { models }) => {
	        return await models.User.find({});
	    },
	    me: async (parent, args, { models, user }) => {
	        return await models.User.findById(user.id);
	    }
	},

	Mutation: {
		newNote: async (parent, args, { models, user }) => {
	        if(!user) {
	            throw new AuthenticationError('You must be signed in to create a note');
	        }
	        return await models.Note.create({
	            content: args.content,
	            author: new mongoose.Types.ObjectId(user.id)
	        });
	    },
	    deleteNote: async (parent, { id }, { models, user }) => {
	        if (!user) {
	            throw new AuthenticationError('You must be signed in to delete a note');
	        }
	        const note = await models.Note.findById(id);
	        if(note && String(note.author) !== user.id) {
	            throw new ForbiddenError("You don't have permission to delete the note");
	        }
	        try {
	            await models.Note.findOneAndDelete({_id: id});
	            return true;
	        } catch (err) {
	            return false;
	        }
	    },
	    updateNote: async (parent, { content, id }, { models, user }) => {
	        if(!user) {
	            throw new AuthenticationError('You must be signed in to update a note');
	        }
	        const note = await models.Note.findById(id);
	        if(note && String(note.author) !== user.id) {
	            throw new ForbiddenError("You don't have permission to update the note");
	        }
	        return await models.Note.findOneAndUpdate(
	            {
	                _id: id,
	            },
	            {
	                $set: {
	                    content
	                }
	            },
	            {
	                new: true
	            }
	        );
	    },
	    signUp: async (parent, { username, email, password }, { models }) => {
	        email = email.trim().toLowerCase();
	        const hashed = await bcrypt.hash(password, 10);
	        try {
	            const user = await models.User.create({
	                username,
	                email,
	                password: hashed
	            });
	            return jwt.sign({ id: user._id}, process.env.JWT_SECRET);
	        } catch (err) {
	            console.log(err);
	            throw new Error('Error creating account');
	        }
	    },
	    signIn: async (parent, { username, email, password }, { models }) => {
	        if(email) {
	            email = email.trim().toLowerCase();
	        }
	        const user = await models.User.findOne({
	            $or: [{email}, {username}]
	        });
	        if(!user) {
	            throw new AuthenticationError('Error signing in');
	        }
	        const valid = await bcrypt.compare(password, user.password);
	        if(!valid) {
	            throw new AuthenticationError('Error signing in');
	        }
	        return jwt.sign({id: user._id}, process.env.JWT_SECRET);
	    },
	    toggleFavorite: async (parent, { id }, { models, user }) => {
	        if(!user) {
	            throw new AuthenticationError("You must be signed in to favorite a note");
	        }
	        let noteCheck = await models.Note.findById(id);
	        const hasUser = noteCheck.favoriteBy.indexOf(user.id);

	        if(hasUser >= 0) {
	            return await models.Note.findByIdAndUpdate(
	                id,
	                {
	                    $pull: {
	                        favoriteBy: new mongoose.Types.ObjectId(user.id)
	                    },
	                    $inc: {
	                        favoriteCount: -1
	                    }
	                },
	                {
	                    new: true
	                }
	            );
	        } else {
	            return await models.Note.findByIdAndUpdate(
	                id,
	                {
	                    $push: {
	                        favoriteBy: new mongoose.Types.ObjectId(user.id)
	                    },
	                    $inc: {
	                        favoriteCount: 1
	                    }
	                },
	                {
	                    new: true
	                }
	            );
	        }
	    }
	},

	Note: {
		author: async (note, args, { models }) => {
	        return await models.User.findById(note.author);
	    },
	    favoriteBy: async (note, args, { models }) => {
	        return await models.User.find({ _id: { $in: note.favoriteBy } });
	    }
	},

	User: {
	    notes: async (user, args, { models }) => {
	        return await models.Note.find({ author: user._id }).sort({ _id: -1 });
	    },
	    favorites: async (user, args, { models }) => {
	        return await models.Note.find({ favoriteBy: user._id }).sort({ _id: -1 });
	    }
	},
	
	DateTime: DateTimeResolver
};

module.exports = resolvers;