import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { searchAnime } from '../../services/animeService';
import { HeartSwitch } from '../Shared/HeartSwitch';
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
    };

    if (loading) return (
        <LoadingContainer>
            <img src="https://media.tenor.com/_BiwWBWhYucAAAAi/what-loading.gif" alt="Loading..." />
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
                                    <Badge position="top-right" style={{ background: '#ffd700' }}>
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
                                            <HeartSwitch
                                                size="sm"
                                                inactiveColor="rgba(255,255,255,0.5)"
                                                activeColor="#ff0055"
                                                checked={false}
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
