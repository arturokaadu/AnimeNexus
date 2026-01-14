import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { searchAnime } from '../../services/animeService';
import { FavoriteButton } from '../Shared/FavoriteButton';
import { useAuth } from '../Context/authContext';
import { FeatureContainer, FeatureHeader } from './Features.styles';
import {
    Grid,
    Card,
    ImageContainer,
    CardImage,
    Badge,
    CardContent,
    CardTitle,
    CardFooter,
    Rating,
    LoadingContainer
} from '../Anime/Home.styles';

export const HiddenGemsPage = () => {
    const [gems, setGems] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHiddenGems = async () => {
            setLoading(true);
            try {
                // Fetch anime with good scores but low popularity
                const data = await searchAnime('', 1, true);
                const hiddenGems = data.data.filter(anime =>
                    anime.score > 7.5 &&
                    anime.members < 150000 &&
                    anime.score !== null
                ).slice(0, 12);
                setGems(hiddenGems);
            } catch (error) {
                console.error("Error fetching hidden gems:", error);
                toast.error("Error loading hidden gems");
            } finally {
                setLoading(false);
            }
        };

        fetchHiddenGems();
    }, []);

    const HandleHeartClick = (animeData) => {
        if (!user) {
            toast.error("Please log in to add to favorites");
            setTimeout(() => navigate("/login"), 1500);
            return;
        }
        // addOrRemoveFromFavorites would need to be passed as prop or use context
        // For now, consistent with previous behavior, we might not have the function props here 
        // unless passed from App.js routes. 
        // NOTE: The previous code didn't actually have access to addOrRemoveFromFavorites either!
        // It was just defining HandleHeartClick but not calling anything inside except validation.
        // I will keep it as is for now to match original behavior, but it won't actually add to favs
        // unless I update the route in App.js to pass props.
        toast.error("Favorites functionality not fully wired on this page yet");
    };

    if (loading) return (
        <LoadingContainer>
            <img src="https://media.tenor.com/_BiwWBWhYucAAAAj/what-loading.gif" alt="Loading..." />
            <h2>Finding Hidden Gems...</h2>
        </LoadingContainer>
    );

    return (
        <FeatureContainer>
            <FeatureHeader>
                <Icon icon="bi:gem" /> Hidden Gems
            </FeatureHeader>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
                Discover underrated anime with great scores but low popularity
            </p>

            <Grid>
                {gems.map((anime) => {
                    const animeData = {
                        id: anime.mal_id,
                        title: anime.title,
                        img: anime.images.jpg.image_url,
                        overview: anime.synopsis,
                        vote_average: anime.score,
                    };

                    return (
                        <Card key={anime.mal_id}>
                            <Link to={`/detalle?id=${anime.mal_id}`} style={{ textDecoration: 'none', color: 'inherit', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                <ImageContainer>
                                    <CardImage src={anime.images.jpg.large_image_url} alt={anime.title} />
                                    <Badge style={{ top: '8px', right: '8px', position: 'absolute' }}>
                                        💎 Hidden
                                    </Badge>
                                </ImageContainer>

                                <CardContent>
                                    <CardTitle title={anime.title}>{anime.title}</CardTitle>

                                    <CardFooter>
                                        <Rating>★ {anime.score || '?'}</Rating>
                                        <div onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            HandleHeartClick(animeData);
                                        }}>
                                            <FavoriteButton
                                                isFav={false}
                                                onClick={(e) => HandleHeartClick(animeData)}
                                                size={24}
                                            />
                                        </div>
                                    </CardFooter>
                                </CardContent>
                            </Link>
                        </Card>
                    );
                })}
            </Grid>
        </FeatureContainer>
    );
};
