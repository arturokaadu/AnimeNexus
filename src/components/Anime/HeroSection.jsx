import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
// import { Icon } from '@iconify/react';

const HeroContainer = styled.div`
    position: relative;
    height: 500px;
    width: 100%;
    overflow: hidden;
    margin-bottom: 2rem;

    @media (max-width: 768px) {
        height: 400px;
    }
`;

const Slide = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: ${props => props.$active ? 1 : 0};
    transition: opacity 0.5s ease-in-out;
    
    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(to top, #0f0f0f 0%, rgba(15,15,15,0.6) 50%, rgba(15,15,15,0.3) 100%);
    }
`;

const Content = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 3rem;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 800px;

    @media (max-width: 768px) {
        padding: 1.5rem;
    }
`;

const GenreBadge = styled.span`
    background: #ef4444;
    color: white;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
    width: fit-content;
    text-transform: uppercase;
`;

const Title = styled.h1`
    font-size: 3rem;
    font-weight: 800;
    color: white;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    margin: 0;
    line-height: 1.1;

    @media (max-width: 768px) {
        font-size: 2rem;
    }
`;

const Synopsis = styled.p`
    color: rgba(255,255,255,0.9);
    font-size: 1rem;
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-width: 600px;
    margin: 0;

    @media (max-width: 768px) {
        font-size: 0.9rem;
        -webkit-line-clamp: 2;
    }
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
`;

// const WatchButton = styled(Link)`
//     background: #ef4444;
//     color: white;
//     padding: 0.8rem 2rem;
//     border-radius: 8px;
//     text-decoration: none;
//     font-weight: bold;
//     display: flex;
//     align-items: center;
//     gap: 0.5rem;
//     transition: all 0.2s;
//
//     &:hover {
//         background: #dc2626;
//         transform: translateY(-2px);
//     }
// `;

const InfoButton = styled(Link)`
    background: rgba(255, 255, 255, 0.2);
    color: white;
    padding: 0.8rem 2rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: bold;
    backdrop-filter: blur(5px);
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.3);
    }
`;

const Indicators = styled.div`
position: absolute;
bottom: 1.5rem;
right: 3rem;
display: flex;
gap: 0.5rem;
z - index: 3;

@media(max - width: 768px) {
    right: 1.5rem;
}
`;

const Dot = styled.button`
width: 10px;
height: 10px;
border - radius: 50 %;
border: none;
background: ${props => props.$active ? '#ef4444' : 'rgba(255,255,255,0.5)'};
cursor: pointer;
transition: all 0.3s;

    &:hover {
    background: #ef4444;
}
`;

export const HeroSection = ({ slides }) => {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        if (!slides || slides.length === 0) return;
        const timer = setInterval(() => {
            setCurrent(prev => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides]);

    if (!slides || slides.length === 0) return null;

    return (
        <HeroContainer>
            {slides.map((slide, index) => (
                <Slide
                    key={slide.mal_id}
                    $active={index === current}
                >
                    <img
                        src={slide.bannerImage || slide.images?.jpg?.large_image_url}
                        alt={slide.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: -1
                        }}
                        loading={index === 0 ? "eager" : "lazy"}
                        fetchpriority={index === 0 ? "high" : "auto"}
                    />
                    <Content>
                        <GenreBadge>{slide.genre || 'Trending'}</GenreBadge>
                        <Title>{slide.title}</Title>
                        <Synopsis>{slide.synopsis}</Synopsis>
                        <ButtonGroup>
                            <InfoButton to={`/ detalle ? id = ${slide.mal_id} `}>
                                View Details
                            </InfoButton>
                        </ButtonGroup>
                    </Content>
                </Slide>
            ))}
            <Indicators>
                {slides.map((_, index) => (
                    <Dot
                        key={index}
                        $active={index === current}
                        onClick={() => setCurrent(index)}
                    />
                ))}
            </Indicators>
        </HeroContainer>
    );
};
