<?php
/**
 * Front-end render functions for the Listing block.
 *
 * @package Newspack_Listings
 */

namespace Newspack_Listings\Listing_Block;

use \Newspack_Listings\Newspack_Listings_Core as Core;

/**
 * Dynamic block registration.
 */
function register_blocks() {
	// Listings block attributes.
	$block_json = json_decode(
		file_get_contents( __DIR__ . '/block.json' ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		true
	);

	// Parent Curated List block attributes.
	$parent_block_json = json_decode(
		file_get_contents( dirname( __DIR__ ) . '/curated-list/block.json' ), // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		true
	);

	// Combine attributes with parent attributes, so parent can pass data to InnerBlocks.
	$attributes = array_merge( $block_json['attributes'], $parent_block_json['attributes'] );

	// Register a block for each listing type.
	foreach ( Core::NEWSPACK_LISTINGS_POST_TYPES as $label => $post_type ) {
		register_block_type(
			'newspack-listings/' . $label,
			[
				'attributes'      => $attributes,
				'render_callback' => __NAMESPACE__ . '\render_block',
			]
		);
	}
}

/**
 * Block render callback.
 *
 * @param array $attributes Block attributes (including parent attributes inherited from Curated List container block).
 */
function render_block( $attributes ) {
	// Don't output the block inside RSS feeds.
	if ( is_feed() ) {
		return;
	}

	// Bail if there's no listing post ID for this block.
	if ( empty( $attributes['listing'] ) ) {
		return;
	}

	// Get the listing post by post ID.
	$post = get_post( intval( $attributes['listing'] ) );

	// Bail if there's no post with the saved ID.
	if ( empty( $post ) ) {
		return;
	}

	// Begin front-end output.
	// TODO: Templatize this output; integrate more variations based on attributes.
	ob_start();

	?>
	<li class="newspack-listings__listing">
		<article
			class="newspack-listings__listing-post"
			<?php
			if ( ! empty( $attributes['textColor'] ) ) {
				echo esc_attr( 'style="color:' . $attributes['textColor'] . ';"' );
			}
			?>
		>
			<?php if ( true === $attributes['showImage'] ) : ?>
				<?php
				$featured_image = get_the_post_thumbnail( $post->ID, 'large' );
				if ( ! empty( $featured_image ) ) :
					?>
					<figure class="newspack-listings__listing-featured-media">
						<a class="newspack-listings__listing-link" href="<?php echo esc_url( get_permalink( $post->ID ) ); ?>">
							<?php echo wp_kses_post( $featured_image ); ?>
							<?php if ( true === $attributes['showCaption'] ) : ?>
							<figcaption class="newspack-listings__listing-caption">
								<?php echo wp_kses_post( get_the_post_thumbnail_caption( $post->ID ) ); ?>
							</figcaption>
							<?php endif; ?>
						</a>
					</figure>
				<?php endif; ?>
			<?php endif; ?>

			<div class="newspack-listings__listing-meta">
				<?php if ( true === $attributes['showCategory'] ) : ?>
				<div class="cat-links">
					<?php
					$categories = get_the_terms( $post->ID, Core::NEWSPACK_LISTINGS_CAT );
					if ( is_array( $categories ) ) :
						foreach ( $categories as $category ) :
							$term_url = get_term_link( $category->slug, Core::NEWSPACK_LISTINGS_CAT );

							if ( empty( $term_url ) ) {
								$term_url = '#';
							}
							?>
							<a href="<?php echo esc_url( $term_url ); ?>">
								<?php echo wp_kses_post( $category->name ); ?>
							</a>
						<?php endforeach; ?>
					<?php endif; ?>
				</div>
				<?php endif; ?>

				<a class="newspack-listings__listing-link" href="<?php echo esc_url( get_permalink( $post->ID ) ); ?>">
					<h3 class="newspack-listings__listing-title"><?php echo wp_kses_post( $post->post_title ); ?></h3>
					<?php if ( true === $attributes['showAuthor'] ) : ?>
					<cite>
						<?php echo wp_kses_post( __( 'By', 'newspack-listings' ) . ' ' . get_the_author_meta( 'display_name', $post->post_author ) ); ?>
					</cite>
					<?php endif; ?>

					<?php
					if ( true === $attributes['showExcerpt'] ) {
						echo wp_kses_post( wpautop( get_the_excerpt( $post->ID ) ) );
					}
					?>
				</a>
			</div>
		</article>
	</li>
	<?php

	$content = ob_get_clean();

	return $content;
}

register_blocks();
