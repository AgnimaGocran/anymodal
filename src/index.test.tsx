/// <reference types="@testing-library/jest-dom" />

import React from 'react';
import {
	render,
	screen,
	waitFor,
	fireEvent,
	cleanup,
} from '@testing-library/react';
import { describe, test, expect, afterEach, beforeEach, mock } from 'bun:test';
import anyModal from './index';

describe('anyModal with React Testing Library', () => {
	describe('Core Functionality', () => {
		const modals = anyModal<
			| { type: 'profile'; userId: number }
			| { type: 'view-post'; postId: number; authorId: number }
		>();
		const { ModalContainer } = modals;

		afterEach(() => {
			modals.close();
			cleanup();
		});

		test('should show and hide a simple modal', async () => {
			modals.create('profile', ({ modal }) => (
				<div>User ID: {modal.userId}</div>
			));
			render(<ModalContainer />);
			modals.show({ type: 'profile', userId: 123 });
			await waitFor(() => expect(screen.getByText('User ID: 123')).not.toBeNull());
			modals.close();
			await waitFor(() => expect(screen.queryByText(/User ID:/)).toBeNull());
		});
	});

	describe('createWithFetch', () => {
		type FetchModals =
			| { type: 'user-profile'; userId: number }
			| { type: 'post'; postId: number };

		const loader = () => <div>Loading...</div>;
		const fetchModals = anyModal<FetchModals>(loader);

		const mockApi = {
			getUser: mock((id: number) => Promise.resolve({ id, name: `User ${id}` })),
			getPosts: mock((userId: number) => Promise.resolve([{ id: 1, title: `Post by ${userId}` }])),
			getPost: mock((id: number) => Promise.resolve({ id, title: `Post ${id}` })),
		};

		beforeEach(() => {
			mockApi.getUser.mockClear();
			mockApi.getPosts.mockClear();
			mockApi.getPost.mockClear();
		});

		afterEach(() => {
			fetchModals.close();
			cleanup();
		});

		test('should handle a single fetcher', async () => {
			fetchModals.createWithFetch(
				'post',
				({ postId }) => mockApi.getPost(postId),
				({ data: post, update }) => (
					<div>
						<h1>{post.title}</h1>
						<button onClick={update}>Update Post</button>
					</div>
				)
			);

			render(<fetchModals.ModalContainer />);
			fetchModals.show({ type: 'post', postId: 101 });

			await screen.findByText('Post 101');
			expect(mockApi.getPost).toHaveBeenCalledTimes(1);

			const updateBtn = screen.getByText('Update Post');
			fireEvent.click(updateBtn);

			await waitFor(() => {
				expect(mockApi.getPost).toHaveBeenCalledTimes(2);
			});
		});

		test('should handle an array of fetchers', async () => {
			fetchModals.createWithFetch(
				'user-profile',
				[
					({ userId }) => mockApi.getUser(userId),
					({ userId }) => mockApi.getPosts(userId),
				] as const,
				({ data: [user, posts], update, updateAll }) => (
					<div>
						<h1>{user.name}</h1>
						<p>Posts: {posts.length}</p>
						<button onClick={update[0]}>Update User</button>
						<button onClick={update[1]}>Update Posts</button>
						<button onClick={updateAll}>Update All</button>
					</div>
				)
			);

			render(<fetchModals.ModalContainer />);
			fetchModals.show({ type: 'user-profile', userId: 2 });

			await screen.findByText('User 2');
			expect(mockApi.getUser).toHaveBeenCalledTimes(1);
			expect(mockApi.getPosts).toHaveBeenCalledTimes(1);

			const updateUserBtn = screen.getByText('Update User');
			const updatePostsBtn = screen.getByText('Update Posts');
			const updateAllBtn = screen.getByText('Update All');

			fireEvent.click(updateUserBtn);
			await waitFor(() => expect(mockApi.getUser).toHaveBeenCalledTimes(2));
			expect(mockApi.getPosts).toHaveBeenCalledTimes(1);

			fireEvent.click(updatePostsBtn);
			await waitFor(() => expect(mockApi.getPosts).toHaveBeenCalledTimes(2));
			expect(mockApi.getUser).toHaveBeenCalledTimes(2);

			fireEvent.click(updateAllBtn);
			await waitFor(() => expect(mockApi.getUser).toHaveBeenCalledTimes(3));
			expect(mockApi.getPosts).toHaveBeenCalledTimes(3);
		});
	});
});