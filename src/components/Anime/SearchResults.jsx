import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { useAuth } from "../Context/authContext";
import { searchAnime } from "../../services/animeService";
import { groupAnimeByBase } from "../../utils/animeGrouping";
import { AnimeCard } from "../Shared/AnimeCard";
import { Icon } from '@iconify/react';
import {
    Container,
    Header,
    Grid,
    LoadingContainer,
    LoadMoreSpinner
} from './SearchResults.styles';

export const SearchResults = ({ addOrRemoveFromFavorites, favs }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const query = new URLSearchParams(window.location.search);
    const keyword = query.get("keyword") || "";
    const type = query.get("type") || null;
    const rating = query.get("rating") || null;
    const genre = query.get("genre") || null;
    const [seriesResults, setSeriesResults] = useState([]);
    const [movieResults, setMovieResults] = useState([]);
    const [rawResults, setRawResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const loadMoreRef = useRef(null);

    // Reset when query changes
    useEffect(() => {
        setSeriesResults([]);
        setMovieResults([]);
        setPage(1);
        setHasMore(true);
    }, [keyword, type, rating, genre]);

    // Fetch results
    useEffect(() => {
        const fetchResults = async () => {
            setLoading(true);
            try {
                const sfwMode = !user?.settings?.showNSFW;
                const data = await searchAnime(keyword, page, sfwMode, genre, type, rating);
                const newResults = data.data;

                if (page === 1 && newResults.length === 0) {
                    toast.error("No results found");
                }

                // Accumulate raw results
                let updatedRawResults;
                if (page === 1) {
                    updatedRawResults = newResults;
                } else {
                    updatedRawResults = [...rawResults, ...newResults];
                }
                setRawResults(updatedRawResults);

                // Group everything - pass keyword to filter OVAs/Specials appropriately
                const grouped = groupAnimeByBase(updatedRawResults, keyword);
                console.log("Search Results - Total Raw:", updatedRawResults.length);
                console.log("Search Results - Grouped Series:", grouped.series.length);
                console.log("Search Results - Movies:", grouped.movies.length);

                setSeriesResults(grouped.series);
                setMovieResults(grouped.movies);

                setHasMore(data.pagination?.has_next_page);
            } catch (error) {
                console.error(error);
                toast.error("Error searching anime");
            } finally {
                setLoading(false);
            }
        };
        if (keyword || type || rating || genre) {
            fetchResults();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyword, type, rating, page, user]); // Keeping rawResults out if it causes infinite loops, or adding it properly if safe.
    // Actually, adding rawResults to deps when we use it inside to create new state WILL cause infinite loop if not handled carefully
    // because setRawResults updates it.
    // Standard fix: functional update for setRawResults and remove dependency, OR disable lint.
    // Let's use functional update inside fetchResults so we don't depend on rawResults in the effect closure.

    // Infinite scroll
    useEffect(() => {
        if (loading || !hasMore) return;
        const observer = new IntersectionObserver(entries => {
            const target = entries[0];
            if (target.isIntersecting) {
                setPage(prev => prev + 1);
            }
        }, { rootMargin: "200px", threshold: 0.1 });
        const current = loadMoreRef.current;
        if (current) observer.observe(current);
        return () => {
            if (current) observer.unobserve(current);
            observer.disconnect();
        };
    }, [hasMore, loading]);

    const HandleHeartClick = (e, animeData) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            toast.error("Please log in to add to favorites");
            setTimeout(() => navigate("/login"), 1500);
            return;
        }
        addOrRemoveFromFavorites(animeData);
    };

    if (loading && page === 1) {
        return (
            <LoadingContainer>
                <div className="spinner"></div>
                <style>{`\n                    .spinner {\n                        width: 50px;\n                        height: 50px;\n                        border: 5px solid rgba(255, 255, 255, 0.1);\n                        border-top: 5px solid #fbbf24;\n                        border-radius: 50%;\n                        animation: spin 1s linear infinite;\n                    }\n                    @keyframes spin {\n                        0% { transform: rotate(0deg); }\n                        100% { transform: rotate(360deg); }\n                    }\n                `}</style>
            </LoadingContainer>
        );
    }

    return (
        <Container>
            <Header>{keyword ? `Results for: ${keyword}` : (type === 'movie' ? 'Movies' : type === 'tv' ? 'Series' : rating ? `Rated: ${rating}` : 'Results')}</Header>
            <Grid>
                {seriesResults.map(anime => {
                    const animeData = {
                        id: anime.mal_id,
                        title: anime.title,
                        img: anime.images.jpg.large_image_url,
                        overview: anime.synopsis,
                        vote_average: anime.score,
                    };
                    const isFav = favs.find(fav => fav.id === anime.mal_id);
                    return (
                        <AnimeCard
                            key={anime.mal_id}
                            anime={anime}
                            isFav={isFav}
                            onHeartClick={e => HandleHeartClick(e, animeData)}
                        />
                    );
                })}
            </Grid>
            {movieResults.length > 0 && (
                <>
                    <Header style={{ marginTop: '3rem', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                        <h2 style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Icon icon="bi:film" /> Movies ({movieResults.length})
                        </h2>
                    </Header>
                    <Grid>
                        {movieResults.map(anime => {
                            const animeData = {
                                id: anime.mal_id,
                                title: anime.title,
                                img: anime.images.jpg.image_url,
                                overview: anime.synopsis,
                                vote_average: anime.score,
                            };
                            const isFav = favs.find(fav => fav.id === anime.mal_id);
                            return (
                                <AnimeCard
                                    key={anime.mal_id}
                                    anime={anime}
                                    isFav={isFav}
                                    onHeartClick={e => HandleHeartClick(e, animeData)}
                                />
                            );
                        })}
                    </Grid>
                </>
            )}
            <LoadMoreSpinner ref={loadMoreRef} />
        </Container>
    );
};
