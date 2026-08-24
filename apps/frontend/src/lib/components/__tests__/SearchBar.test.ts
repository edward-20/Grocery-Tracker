import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import WrapperSearchBar from './WrapperSearchBar.svelte';
import { render, screen, within } from '@testing-library/svelte';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import userEvent from '@testing-library/user-event';

const suggestions = [
	'great',
	'amazing',
	'food',
	'is',
	'on',
	'the',
	'way',
	'jambalaya',
	'stupid fish',
	'crayfish',
	'basa',
	'beets',
	'asoihwfoih',
	'ncoiwehfvb',
	'ascnpqcn',
	'obniehgwepm',
	'ipnpca',
	'aiowmmcica'
];

function setUpMockServer() {
	const server = setupServer(
		http.get('/fake-endpoint', async ({ request }) => {
			// this needs to take in an argument and filter suggestions by
			const url = new URL(request.url);
			const query = url.searchParams.get('query');
			if (query === null) return HttpResponse.json(suggestions);
			return HttpResponse.json(suggestions.filter((suggestion) => suggestion.includes(query)));
		})
	);
	return server;
}
describe('SearchBar', () => {
	beforeEach(() => {
		render(WrapperSearchBar);
	});

	it('renders input with label and placeholder', () => {
		const combobox = screen.getByRole('combobox');
		expect(combobox).toBeInTheDocument();

		const labelledEntity = screen.getByLabelText('Product Name:');
		expect(labelledEntity).toBeInTheDocument();
		expect(labelledEntity).toHaveAttribute('placeholder', 'Juniper beads');
	});

	it("reflects what the user typed in if they don't interact with suggestions", async () => {
		const user = userEvent.setup();
		await user.click(screen.getByRole('combobox'));
		expect(screen.getByRole('combobox')).toHaveFocus();
		await user.keyboard('foo');
		expect(screen.getByRole('combobox')).toHaveValue('foo');
	});

	it('loses focus when tab is pressed', async () => {
		const user = userEvent.setup();
		await user.click(screen.getByRole('combobox'));
		expect(screen.getByRole('combobox')).toHaveFocus();
		await user.keyboard('{Escape}');
		expect(screen.getByRole('combobox')).not.toHaveFocus();
	});

	describe('displays suggestions after typing if there are suggestions matching', () => {
		// need to mock the endpoint
		const server = setUpMockServer();
		beforeAll(() => {
			server.listen();
		});
		afterAll(() => {
			server.close();
		});

		// repeated testing with different inputs
		async function assertSuggestions(input: string, suggestions: string[]) {
			const user = userEvent.setup();

			await user.click(screen.getByRole('combobox'));
			await user.keyboard(input);

			const listbox = await screen.findByRole('listbox');
			const options = await within(listbox).findAllByRole('option');

			const expected = suggestions.filter((word) => word.includes(input));

			expect(options).toHaveLength(expected.length);

			options.forEach((option, index) => {
				expect(option).toHaveTextContent(expected[index]);
			});
		}

		it.each(['e', 'a', 'ay'])('display correct suggestions for %s', async (input) => {
			await assertSuggestions(input, suggestions);
		});
	});

	describe('suggestions displayed and focus is in the combobox', () => {
		// need to mock the endpoint
		const server = setUpMockServer();

		beforeAll(() => {
			server.listen();
		});

		it('displays suggestions after typing and can navigate through the suggestions', async () => {
			const user = userEvent.setup();
			await user.click(screen.getByRole('combobox'));
			await user.keyboard('ac');
			const expectedSuggestions = suggestions.filter((word) => word.includes('ac'));

			for (let i = 0; i < expectedSuggestions.length; i++) {
				await user.keyboard('{ArrowDown}');
				const options = screen.getAllByRole('option');
				expect(options[i]).toHaveAttribute('aria-selected', 'true');
				expect(screen.getByRole('combobox')).toHaveAttribute(
					'aria-activedescendant',
					`suggestion-${i}`
				);
				expect(screen.getByText(expectedSuggestions[0])).toHaveAttribute('id', `suggestion-${i}`);
			}
		});
		// it("moves focus into the first elment of suggestions with down arrow")
		it('moves focus into the last elment of suggestions with up arrow', async () => {
			const user = userEvent.setup();
			await user.click(screen.getByRole('combobox'));
			await user.keyboard('o');
			const expectedSuggestions = suggestions.filter((word) => word.includes('o'));
			const lastIndex = expectedSuggestions.length - 1;

			const options = await screen.findAllByRole('option', {}, { timeout: 10000 });
			await user.keyboard('{ArrowUp}');
			expect(options[lastIndex]).toHaveAttribute('aria-selected', 'true');
			expect(screen.getByRole('combobox')).toHaveAttribute(
				'aria-activedescendant',
				`suggestion-${lastIndex}`
			);
			expect(screen.getByText(expectedSuggestions[lastIndex])).toHaveAttribute(
				'id',
				`suggestion-${lastIndex}`
			);
		});
		it('dismisses the popup if its visible when pressing escape', async () => {
			const user = userEvent.setup();
			await user.click(screen.getByRole('combobox'));
			await user.keyboard('o');
			await screen.findByRole('listbox');
			await user.keyboard('{ArrowDown}');
			await screen.findByRole('listbox');
			await user.keyboard('{Escape}');
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		});
	});

	describe('suggestions displayed and focus is in the listbox', () => {
		// need to mock the endpoint
		const server = setUpMockServer();

		beforeAll(() => {
			server.listen();
		});
		afterAll(() => {
			server.close();
		});

		it('accepts the focused option in the listbox by closing the popup,\
			placing the accepted value in the combobox and\
			if the combobox is editable placing the input cursor at the end of the value after pressing enter', async () => {
			screen.getByRole('combobox');
			const user = userEvent.setup();
			await user.click(screen.getByRole('combobox'));
			await user.keyboard('a');
			const listbox = await screen.findByRole('listbox');
			expect(listbox).toBeInTheDocument();
			const expectedWord = suggestions.filter((word) => word.includes('a'))[0];
			await user.keyboard('{ArrowDown}{Enter}');
			const combobox = screen.getByRole('combobox') as HTMLInputElement;
			expect(combobox).toHaveValue(expectedWord);
			expect(combobox.selectionStart).toBe(combobox.value.length);
			expect(combobox.selectionEnd).toBe(combobox.value.length);
		});

		it('closes the popup and returns focus to the combobox after pressing escape', async () => {
			screen.getByRole('combobox');
			const user = userEvent.setup();
			await user.click(screen.getByRole('combobox'));
			await user.keyboard('a');
			const listbox = await screen.findByRole('listbox');
			expect(listbox).toBeInTheDocument();
			await user.keyboard('{ArrowDown}{Escape}');
			const combobox = screen.getByRole('combobox');
			expect(combobox).toHaveAttribute('aria-expanded', 'false');
			expect(combobox).toHaveFocus();
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		});

		it('moves focus to combobox when on the first suggestion and pressing arrow up', async () => {
			screen.getByRole('combobox');
			const user = userEvent.setup();
			await user.click(screen.getByRole('combobox'));
			await user.keyboard('a');
			const listbox = await screen.findByRole('listbox');
			expect(listbox).toBeInTheDocument();
			await user.keyboard('{ArrowDown}{ArrowUp}');
			expect(screen.getByRole('combobox')).toHaveFocus();
		});

		it('moves focus to combobox when on the last suggestion and pressing arrow down', async () => {
			screen.getByRole('combobox');
			const user = userEvent.setup();
			await user.click(screen.getByRole('combobox'));
			await user.keyboard('a');
			const listbox = await screen.findByRole('listbox');
			expect(listbox).toBeInTheDocument();
			await user.keyboard('{ArrowUp}{ArrowDown}');
			expect(screen.getByRole('combobox')).toHaveFocus();
		});

		it('displays suggestions after typing and can navigate through the suggestions and then continue typing', async () => {
			screen.getByRole('combobox');
			const user = userEvent.setup();
			await user.click(screen.getByRole('combobox'));
			await user.keyboard('a');
			const expectedSuggestions = suggestions.filter((word) => word.includes('a'));
			const listbox = await screen.findByRole('listbox');
			expect(listbox).toBeInTheDocument();
			await user.keyboard('{ArrowDown}{ArrowDown}a');
			expect(screen.getByRole('combobox')).toHaveValue(`${expectedSuggestions[1]}a`);
		});
	});

	it('selects a suggestion on click', async () => {
		const server = setUpMockServer();
		server.listen();
		const user = userEvent.setup();
		await user.click(screen.getByRole('combobox'));
		await user.keyboard('e');
		const expectedSuggestions = suggestions.filter((word) => word.includes('e'));
		const listbox = await screen.findByRole('listbox');
		expect(listbox).toBeInTheDocument();
		const secondOption = screen.getByText(`${expectedSuggestions[1]}`);
		expect(secondOption).toBeInTheDocument();
		await user.click(secondOption);
		expect(screen.getByRole('combobox')).toHaveValue(`${expectedSuggestions[1]}`);
		expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		server.close();
	});
});
