/**
 * VIEW
 * JavaScript used on front of site.
 */

const fetchRetryCount = 3;

/**
 * Load More Button Handling
 *
 * Calls Array.prototype.forEach for IE11 compatibility.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NodeList
 */
Array.prototype.forEach.call(
	document.querySelectorAll( '.newspack-listings__curated-list.has-more-button' ),
	buildLoadMoreHandler
);

/**
 * Builds a function to handle clicks on the load more button.
 * Creates internal state via closure to ensure all state is
 * isolated to a single Block + button instance.
 *
 * @param {HTMLElement} blockWrapperEl the button that was clicked
 */
function buildLoadMoreHandler( blockWrapperEl ) {
	const btnEl = blockWrapperEl.querySelector( '[data-next]' );
	if ( ! btnEl ) {
		return;
	}
	const postsContainerEl = blockWrapperEl.querySelector( '.newspack-listings__list-container' );
	const btnText = btnEl.textContent.trim();
	const loadingText = blockWrapperEl.querySelector( '.loading' ).textContent;

	// Set initial state flags.
	let isFetching = false;
	let isEndOfData = false;

	btnEl.addEventListener( 'click', () => {
		// Early return if still fetching or no more posts to render.
		if ( isFetching || isEndOfData ) {
			return false;
		}

		isFetching = true;

		blockWrapperEl.classList.remove( 'is-error' );
		blockWrapperEl.classList.add( 'is-loading' );

		if ( loadingText ) {
			btnEl.textContent = loadingText;
		}

		const requestURL = btnEl.getAttribute( 'data-next' );

		fetchWithRetry( { url: requestURL, onSuccess, onError }, fetchRetryCount );

		/**
		 * @param {Object} data Post data
		 */
		function onSuccess( data, next ) {
			// Validate received data.
			if ( ! isPostsDataValid( data ) ) {
				return onError();
			}

			if ( data.length ) {
				// Render posts' HTML from string.
				const postsHTML = data.map( item => item.html ).join( '' );
				postsContainerEl.insertAdjacentHTML( 'beforeend', postsHTML );
			}

			if ( next ) {
				// Save next URL as button's attribute.
				btnEl.setAttribute( 'data-next', data.next );
			}

			// Remove next button if we're done.
			if ( ! data.length || ! next ) {
				isEndOfData = true;
				blockWrapperEl.removeChild( btnEl );
				blockWrapperEl.classList.remove( 'has-more-button' );
			}

			isFetching = false;

			blockWrapperEl.classList.remove( 'is-loading' );
			btnEl.textContent = btnText;
		}

		/**
		 * Handle fetching error
		 */
		function onError() {
			isFetching = false;

			blockWrapperEl.classList.remove( 'is-loading' );
			blockWrapperEl.classList.add( 'is-error' );
			btnEl.textContent = btnText;
		}
	} );
}

/**
 * Wrapper for XMLHttpRequest that performs given number of retries when error
 * occurs.
 *
 * @param {Object} options XMLHttpRequest options
 * @param {number} n retry count before throwing
 */
function fetchWithRetry( options, n ) {
	const xhr = new XMLHttpRequest();

	xhr.onreadystatechange = () => {
		// Return if the request is completed.
		if ( xhr.readyState !== 4 ) {
			return;
		}

		// Call onSuccess with parsed JSON if the request is successful.
		if ( xhr.status >= 200 && xhr.status < 300 ) {
			const data = JSON.parse( xhr.responseText );
			const next = xhr.getResponseHeader( 'next-url' );

			return options.onSuccess( data, next );
		}

		// Call onError if the request has failed n + 1 times (or if n is undefined).
		if ( ! n ) {
			return options.onError();
		}

		// Retry fetching if request has failed and n > 0.
		return fetchWithRetry( options, n - 1 );
	};

	xhr.open( 'GET', options.url );
	xhr.send();
}

/**
 * Validates the "Load more" posts endpoint schema:
 * {
 * 	"type": "array",
 * 	"items": {
 * 		"type": "object",
 * 		"properties": {
 * 			"html": {
 * 				"type": "string"
 * 			}
 * 		},
 * 		"required": ["html"]
 * 	},
 * }
 *
 * @param {Object} data posts endpoint payload
 */
function isPostsDataValid( data ) {
	let isValid = false;

	if ( data && Array.isArray( data ) ) {
		isValid = true;

		if (
			data.length &&
			! ( hasOwnProp( data[ 0 ], 'html' ) && typeof data[ 0 ].html === 'string' )
		) {
			isValid = false;
		}
	}

	return isValid;
}

/**
 * Checks if object has own property.
 *
 * @param {Object} obj Object
 * @param {string} prop Property to check
 */
function hasOwnProp( obj, prop ) {
	return Object.prototype.hasOwnProperty.call( obj, prop );
}