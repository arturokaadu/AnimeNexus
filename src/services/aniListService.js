import axios from 'axios';

const ANILIST_API_URL = 'https://graphql.anilist.co';

const animeQuery = `
  query ($search: String) {
    Media (search: $search, type: ANIME) {
      id
      idMal
      title {
        romaji
        english
        native
      }
      bannerImage
      coverImage {
        extraLarge
        large
      }
      description
      externalLinks {
        site
        url
        icon
        color
      }
      streamingEpisodes {
        title
        thumbnail
        url
        site
      }
    }
  }
`;

export const getAniListAnime = async (title) => {
  try {
    const response = await axios.post(ANILIST_API_URL, {
      query: animeQuery,
      variables: { search: title }
    });

    if (response.data.errors) {
      console.warn("AniList Errors:", response.data.errors);
      return null;
    }

    return response.data.data.Media;
  } catch (error) {
    console.warn("AniList API currently unavailable/error:", error.message);
    return null;
  }
};
