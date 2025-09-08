// ecosystem-organisms.js - 2D Rendering Models for Organisms
// This file now contains ONLY the 2D rendering models 

// 2D model configurations for each organism type
const organismModels = {
    producer: {
        render: function (organism, container) {
            // Create main body
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible'; // Allow elements to extend beyond container

            // Create stem with 3D effect
            const stem = document.createElement('div');
            stem.style.position = 'absolute';
            stem.style.width = '3px';
            stem.style.height = `${organism.size * 0.9}px`;
            stem.style.backgroundColor = '#8B4513';
            stem.style.bottom = '0';
            stem.style.left = '50%';
            stem.style.transform = 'translateX(-50%) rotateY(5deg)';
            stem.style.boxShadow = '1px 1px 2px rgba(0,0,0,0.3)';
            stem.style.transformOrigin = 'bottom center';
            body.appendChild(stem);

            // Add small branch
            if (Math.random() > 0.5) {
                const branch = document.createElement('div');
                branch.style.position = 'absolute';
                branch.style.width = '2px';
                branch.style.height = `${organism.size * 0.3}px`;
                branch.style.backgroundColor = '#8B4513';
                branch.style.bottom = `${organism.size * 0.5}px`;
                branch.style.left = '0';
                branch.style.transform = 'translateX(-50%) rotate(45deg)';
                branch.style.transformOrigin = 'bottom left';
                stem.appendChild(branch);
            }

            // Create leaf structure that's more 3D
            const leafCount = Math.floor(Math.random() * 3) + 2;
            const leafColors = ['#228B22', '#32CD32', '#006400', '#008000'];

            for (let i = 0; i < leafCount; i++) {
                const leaf = document.createElement('div');
                leaf.style.position = 'absolute';
                leaf.style.width = `${70 + Math.random() * 30}%`;
                leaf.style.height = `${50 + Math.random() * 20}%`;
                leaf.style.backgroundColor = leafColors[Math.floor(Math.random() * leafColors.length)];
                leaf.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';

                // Position leaves in a circular arrangement
                const angle = (i / leafCount) * Math.PI * 2;
                const distance = organism.size * 0.2;

                leaf.style.top = `${30 - Math.sin(angle) * distance}%`;
                leaf.style.left = `${50 - Math.cos(angle) * distance}%`;
                leaf.style.transform = `translateZ(${5 + i}px) rotate(${angle * 30}deg)`;
                leaf.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';
                leaf.style.zIndex = 5 - i;

                body.appendChild(leaf);

                // Add a highlight to enhance 3D effect
                const highlight = document.createElement('div');
                highlight.style.position = 'absolute';
                highlight.style.width = '40%';
                highlight.style.height = '20%';
                highlight.style.backgroundColor = 'rgba(255,255,255,0.2)';
                highlight.style.borderRadius = '50%';
                highlight.style.top = '10%';
                highlight.style.left = '10%';
                leaf.appendChild(highlight);
            }

            // Random chance for flower
            if (Math.random() < 0.3) {
                const flowerColors = ['#FFFF00', '#FF6347', '#FF69B4', '#9370DB', '#FF1493'];
                const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];

                // Flower center
                const flowerCenter = document.createElement('div');
                flowerCenter.style.position = 'absolute';
                flowerCenter.style.width = '30%';
                flowerCenter.style.height = '30%';
                flowerCenter.style.backgroundColor = '#FFA500';
                flowerCenter.style.borderRadius = '50%';
                flowerCenter.style.top = '10%';
                flowerCenter.style.left = '35%';
                flowerCenter.style.transform = 'translateZ(15px)';
                flowerCenter.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                body.appendChild(flowerCenter);

                // Flower petals
                const petalCount = 5 + Math.floor(Math.random() * 3);
                for (let i = 0; i < petalCount; i++) {
                    const petal = document.createElement('div');
                    const angle = (i / petalCount) * Math.PI * 2;

                    petal.style.position = 'absolute';
                    petal.style.width = '25%';
                    petal.style.height = '25%';
                    petal.style.backgroundColor = color;
                    petal.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';

                    const centerX = 50;
                    const centerY = 25;
                    const radius = 15;

                    petal.style.top = `${centerY - Math.sin(angle) * radius}%`;
                    petal.style.left = `${centerX - Math.cos(angle) * radius}%`;
                    petal.style.transform = `translateZ(12px) rotate(${angle * 40}deg)`;
                    petal.style.transformOrigin = 'center center';
                    petal.style.boxShadow = '0 2px 3px rgba(0,0,0,0.2)';

                    body.appendChild(petal);
                }
            }

            // Add subtle animation
            const keyframes = `
                @keyframes gentleSwayPlant${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg); }
                    50% { transform: translateZ(${organism.heightOffset}px) rotate(2deg); }
                    100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `gentleSwayPlant${organism.id} ${3 + Math.random() * 2}s infinite ease-in-out`;
            body.style.transformOrigin = 'bottom center';

            container.appendChild(body);

            return body;
        }
    },
    detritivore: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create segmented body
            body.style.backgroundColor = '#A52A2A';
            body.style.borderRadius = '50% 50% 40% 40% / 40% 40% 60% 60%';
            body.style.boxShadow = '0 5px 10px rgba(0,0,0,0.3)';

            // Add body segments
            const segmentCount = 4;
            const segmentColors = ['#A52A2A', '#8B4513', '#A0522D', '#CD853F'];

            for (let i = 0; i < segmentCount; i++) {
                const segment = document.createElement('div');
                segment.style.position = 'absolute';
                segment.style.width = '70%';
                segment.style.height = '20%';
                segment.style.backgroundColor = segmentColors[i % segmentColors.length];
                segment.style.borderRadius = '40%';
                segment.style.top = `${30 + i * 18}%`;
                segment.style.left = '15%';
                segment.style.transform = `translateZ(${4 - i}px)`;
                segment.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                body.appendChild(segment);

                // Add protrusions on each segment
                if (i > 0) {
                    const leftProtrusion = document.createElement('div');
                    leftProtrusion.style.position = 'absolute';
                    leftProtrusion.style.width = '20%';
                    leftProtrusion.style.height = '40%';
                    leftProtrusion.style.backgroundColor = segmentColors[i % segmentColors.length];
                    leftProtrusion.style.borderRadius = '50%';
                    leftProtrusion.style.top = '30%';
                    leftProtrusion.style.left = '-10%';
                    leftProtrusion.style.transform = 'rotate(-20deg)';
                    segment.appendChild(leftProtrusion);

                    const rightProtrusion = document.createElement('div');
                    rightProtrusion.style.position = 'absolute';
                    rightProtrusion.style.width = '20%';
                    rightProtrusion.style.height = '40%';
                    rightProtrusion.style.backgroundColor = segmentColors[i % segmentColors.length];
                    rightProtrusion.style.borderRadius = '50%';
                    rightProtrusion.style.top = '30%';
                    rightProtrusion.style.right = '-10%';
                    rightProtrusion.style.transform = 'rotate(20deg)';
                    segment.appendChild(rightProtrusion);
                }
            }

            // Add head with features
            const head = document.createElement('div');
            head.style.position = 'absolute';
            head.style.width = '60%';
            head.style.height = '40%';
            head.style.backgroundColor = '#8B4513';
            head.style.borderRadius = '50% 50% 40% 40%';
            head.style.top = '-10%';
            head.style.left = '20%';
            head.style.transform = 'translateZ(6px)';
            head.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.2)';
            body.appendChild(head);

            // Add antennae
            const antennaPositions = [
                { top: '-40%', left: '20%', rotation: -20 },
                { top: '-40%', right: '20%', rotation: 20 }
            ];

            antennaPositions.forEach(pos => {
                const antenna = document.createElement('div');
                antenna.style.position = 'absolute';
                antenna.style.width = '8%';
                antenna.style.height = '40%';
                antenna.style.backgroundColor = '#A52A2A';
                antenna.style.borderRadius = '40%';
                antenna.style.top = pos.top;

                if (pos.left) antenna.style.left = pos.left;
                if (pos.right) antenna.style.right = pos.right;

                antenna.style.transformOrigin = 'bottom center';
                antenna.style.transform = `rotate(${pos.rotation}deg)`;
                head.appendChild(antenna);

                // Add antenna tip
                const tip = document.createElement('div');
                tip.style.position = 'absolute';
                tip.style.width = '150%';
                tip.style.height = '15%';
                tip.style.backgroundColor = '#CD853F';
                tip.style.borderRadius = '50%';
                tip.style.top = '-10%';
                tip.style.left = '-25%';
                antenna.appendChild(tip);
            });

            // Add simple eyes
            const leftEye = document.createElement('div');
            leftEye.style.position = 'absolute';
            leftEye.style.width = '15%';
            leftEye.style.height = '15%';
            leftEye.style.backgroundColor = 'black';
            leftEye.style.borderRadius = '50%';
            leftEye.style.top = '30%';
            leftEye.style.left = '20%';
            leftEye.style.transform = 'translateZ(1px)';
            head.appendChild(leftEye);

            const rightEye = document.createElement('div');
            rightEye.style.position = 'absolute';
            rightEye.style.width = '15%';
            rightEye.style.height = '15%';
            rightEye.style.backgroundColor = 'black';
            rightEye.style.borderRadius = '50%';
            rightEye.style.top = '30%';
            rightEye.style.right = '20%';
            rightEye.style.transform = 'translateZ(1px)';
            head.appendChild(rightEye);

            // Add mandibles
            const leftMandible = document.createElement('div');
            leftMandible.style.position = 'absolute';
            leftMandible.style.width = '20%';
            leftMandible.style.height = '20%';
            leftMandible.style.backgroundColor = '#8B4513';
            leftMandible.style.borderRadius = '50% 0 50% 50%';
            leftMandible.style.bottom = '10%';
            leftMandible.style.left = '15%';
            leftMandible.style.transform = 'translateZ(1px) rotate(-10deg)';
            head.appendChild(leftMandible);

            const rightMandible = document.createElement('div');
            rightMandible.style.position = 'absolute';
            rightMandible.style.width = '20%';
            rightMandible.style.height = '20%';
            rightMandible.style.backgroundColor = '#8B4513';
            rightMandible.style.borderRadius = '0 50% 50% 50%';
            rightMandible.style.bottom = '10%';
            rightMandible.style.right = '15%';
            rightMandible.style.transform = 'translateZ(1px) rotate(10deg)';
            head.appendChild(rightMandible);

            // Add legs - six pairs for insect-like appearance
            const legPositions = [
                { segment: 0, offsetY: '50%', length: '35%', angle: -60 },
                { segment: 1, offsetY: '45%', length: '35%', angle: -30 },
                { segment: 2, offsetY: '40%', length: '35%', angle: 0 },
                { segment: 0, offsetY: '50%', length: '35%', angle: 60, right: true },
                { segment: 1, offsetY: '45%', length: '35%', angle: 30, right: true },
                { segment: 2, offsetY: '40%', length: '35%', angle: 0, right: true }
            ];

            legPositions.forEach(pos => {
                const leg = document.createElement('div');
                leg.style.position = 'absolute';
                leg.style.width = '4%';
                leg.style.height = pos.length;
                leg.style.backgroundColor = '#8B4513';
                leg.style.borderRadius = '40%';
                leg.style.top = pos.offsetY;

                if (pos.right) {
                    leg.style.right = '-5%';
                    leg.style.transformOrigin = 'top right';
                } else {
                    leg.style.left = '-5%';
                    leg.style.transformOrigin = 'top left';
                }

                leg.style.transform = `rotate(${pos.angle}deg)`;
                body.appendChild(leg);

                // Add foot
                const foot = document.createElement('div');
                foot.style.position = 'absolute';
                foot.style.width = '200%';
                foot.style.height = '10%';
                foot.style.backgroundColor = '#CD853F';
                foot.style.borderRadius = '50%';
                foot.style.bottom = '-5%';
                foot.style.left = '-50%';
                leg.appendChild(foot);
            });

            // Add animation - crawling motion
            const keyframes = `
                @keyframes detritivoreCrawl${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) scaleX(1.00) translateY(0px); }
                    25% { transform: translateZ(${organism.heightOffset}px) scaleX(0.95) translateY(1px); }
                    50% { transform: translateZ(${organism.heightOffset}px) scaleX(1.00) translateY(0px); }
                    75% { transform: translateZ(${organism.heightOffset}px) scaleX(1.05) translateY(-1px); }
                    100% { transform: translateZ(${organism.heightOffset}px) scaleX(1.00) translateY(0px); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `detritivoreCrawl${organism.id} 0.8s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },
    decomposer: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create a fungus/bacteria like body
            body.style.backgroundColor = '#8B4513';
            body.style.borderRadius = '50%';
            body.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';

            // Create a more irregular shape using pseudo-elements
            body.style.position = 'relative';

            // Add multiple blob shapes for a more organic appearance
            const blobCount = 7 + Math.floor(Math.random() * 5);
            const blobColors = ['#8B4513', '#A0522D', '#6B4226', '#704214', '#5E361A', '#8A6642'];

            for (let i = 0; i < blobCount; i++) {
                const blob = document.createElement('div');
                blob.style.position = 'absolute';

                // Vary blob sizes
                const size = 30 + Math.random() * 70;
                blob.style.width = `${size}%`;
                blob.style.height = `${size * (0.7 + Math.random() * 0.5)}%`;

                // Random position around the center
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 30;
                blob.style.top = `${50 - Math.sin(angle) * distance - size / 2}%`;
                blob.style.left = `${50 - Math.cos(angle) * distance - size / 2}%`;

                // Random rotation
                blob.style.transform = `translateZ(${Math.random() * 5}px) rotate(${Math.random() * 360}deg)`;

                // Random color
                blob.style.backgroundColor = blobColors[Math.floor(Math.random() * blobColors.length)];

                // Roundness
                blob.style.borderRadius = '50%';

                // Opacity variation
                blob.style.opacity = 0.7 + Math.random() * 0.3;

                // Box shadow for 3D effect
                blob.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';

                body.appendChild(blob);
            }

            // Add texture elements - spots or spores
            const spotCount = 10 + Math.floor(Math.random() * 15);

            for (let i = 0; i < spotCount; i++) {
                const spot = document.createElement('div');
                spot.style.position = 'absolute';

                // Small spots
                const size = 2 + Math.random() * 8;
                spot.style.width = `${size}%`;
                spot.style.height = `${size}%`;

                // Random position
                spot.style.top = `${Math.random() * 100}%`;
                spot.style.left = `${Math.random() * 100}%`;

                // Color and appearance
                spot.style.backgroundColor = Math.random() > 0.5 ? '#F5DEB3' : '#FAEBD7';
                spot.style.borderRadius = '50%';
                spot.style.zIndex = '5';

                // Add shadow
                spot.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';

                body.appendChild(spot);
            }

            // Add hyphae (fungal threads) extending out
            const hyphaeCount = 8 + Math.floor(Math.random() * 5);

            for (let i = 0; i < hyphaeCount; i++) {
                const hyphae = document.createElement('div');
                hyphae.style.position = 'absolute';

                // Line dimensions
                hyphae.style.width = `${5 + Math.random() * 10}%`;
                hyphae.style.height = '2px';

                // Position around the edge
                const angle = (i / hyphaeCount) * Math.PI * 2;
                hyphae.style.top = `${50 - Math.sin(angle) * 5}%`;
                hyphae.style.left = `${50 - Math.cos(angle) * 5}%`;

                // Rotate to point outward
                hyphae.style.transformOrigin = 'left center';
                hyphae.style.transform = `rotate(${angle * 180 / Math.PI}deg)`;

                // Color
                hyphae.style.backgroundColor = '#A0522D';

                // Add to body
                body.appendChild(hyphae);

                // Add small circular ends to some hyphae
                if (Math.random() > 0.5) {
                    const tip = document.createElement('div');
                    tip.style.position = 'absolute';
                    tip.style.width = '5px';
                    tip.style.height = '5px';
                    tip.style.backgroundColor = '#F5DEB3';
                    tip.style.borderRadius = '50%';
                    tip.style.right = '-2px';
                    tip.style.top = '-1.5px';
                    hyphae.appendChild(tip);
                }
            }

            // Add subtle pulsing animation
            const keyframes = `
                @keyframes decomposerPulse${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) scale(1); }
                    50% { transform: translateZ(${organism.heightOffset}px) scale(1.05); }
                    100% { transform: translateZ(${organism.heightOffset}px) scale(1); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `decomposerPulse${organism.id} ${3 + Math.random() * 2}s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },
    herbivore: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create a rounder herbivore body
            body.style.backgroundColor = '#DAA520';
            body.style.borderRadius = '60% 60% 50% 50% / 70% 70% 40% 40%';
            body.style.boxShadow = '0 6px 10px rgba(0,0,0,0.3)';

            // Add a tummy
            const tummy = document.createElement('div');
            tummy.style.position = 'absolute';
            tummy.style.width = '60%';
            tummy.style.height = '50%';
            tummy.style.backgroundColor = '#F4A460';
            tummy.style.borderRadius = '50%';
            tummy.style.bottom = '5%';
            tummy.style.left = '20%';
            tummy.style.zIndex = '2';
            body.appendChild(tummy);

            // Add head that sticks out from body
            const head = document.createElement('div');
            head.style.position = 'absolute';
            head.style.width = '50%';
            head.style.height = '45%';
            head.style.backgroundColor = '#DAA520';
            head.style.borderRadius = '60% 60% 40% 40%';
            head.style.top = '-15%';
            head.style.left = '25%';
            head.style.zIndex = '3';
            head.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.1)';
            head.style.transform = 'translateZ(5px)';
            body.appendChild(head);

            // Add eyes
            const leftEye = document.createElement('div');
            leftEye.style.position = 'absolute';
            leftEye.style.width = '25%';
            leftEye.style.height = '25%';
            leftEye.style.backgroundColor = 'white';
            leftEye.style.borderRadius = '50%';
            leftEye.style.top = '30%';
            leftEye.style.left = '15%';
            leftEye.style.transform = 'translateZ(2px)';
            leftEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(leftEye);

            const rightEye = document.createElement('div');
            rightEye.style.position = 'absolute';
            rightEye.style.width = '25%';
            rightEye.style.height = '25%';
            rightEye.style.backgroundColor = 'white';
            rightEye.style.borderRadius = '50%';
            rightEye.style.top = '30%';
            rightEye.style.right = '15%';
            rightEye.style.transform = 'translateZ(2px)';
            rightEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(rightEye);

            // Add pupils
            const leftPupil = document.createElement('div');
            leftPupil.style.position = 'absolute';
            leftPupil.style.width = '50%';
            leftPupil.style.height = '50%';
            leftPupil.style.backgroundColor = 'black';
            leftPupil.style.borderRadius = '50%';
            leftPupil.style.top = '25%';
            leftPupil.style.left = '25%';
            leftPupil.style.transform = 'translateZ(1px)';
            leftEye.appendChild(leftPupil);

            const rightPupil = document.createElement('div');
            rightPupil.style.position = 'absolute';
            rightPupil.style.width = '50%';
            rightPupil.style.height = '50%';
            rightPupil.style.backgroundColor = 'black';
            rightPupil.style.borderRadius = '50%';
            rightPupil.style.top = '25%';
            rightPupil.style.left = '25%';
            rightPupil.style.transform = 'translateZ(1px)';
            rightEye.appendChild(rightPupil);

            // Add ears
            const leftEar = document.createElement('div');
            leftEar.style.position = 'absolute';
            leftEar.style.width = '30%';
            leftEar.style.height = '35%';
            leftEar.style.backgroundColor = '#DAA520';
            leftEar.style.borderRadius = '50% 50% 0 0';
            leftEar.style.top = '-20%';
            leftEar.style.left = '10%';
            leftEar.style.transform = 'translateZ(-1px) rotate(-10deg)';
            leftEar.style.transformOrigin = 'bottom center';
            leftEar.style.boxShadow = '-1px -1px 3px rgba(0,0,0,0.2)';
            head.appendChild(leftEar);

            const rightEar = document.createElement('div');
            rightEar.style.position = 'absolute';
            rightEar.style.width = '30%';
            rightEar.style.height = '35%';
            rightEar.style.backgroundColor = '#DAA520';
            rightEar.style.borderRadius = '50% 50% 0 0';
            rightEar.style.top = '-20%';
            rightEar.style.right = '10%';
            rightEar.style.transform = 'translateZ(-1px) rotate(10deg)';
            rightEar.style.transformOrigin = 'bottom center';
            rightEar.style.boxShadow = '1px -1px 3px rgba(0,0,0,0.2)';
            head.appendChild(rightEar);

            // Add small nose
            const nose = document.createElement('div');
            nose.style.position = 'absolute';
            nose.style.width = '30%';
            nose.style.height = '10%';
            nose.style.backgroundColor = '#CD853F';
            nose.style.borderRadius = '40%';
            nose.style.bottom = '20%';
            nose.style.left = '35%';
            nose.style.transform = 'translateZ(3px)';
            head.appendChild(nose);

            // Add legs
            const legPositions = [
                { bottom: '0%', left: '15%', rotation: -10 },
                { bottom: '0%', right: '15%', rotation: 10 },
            ];

            legPositions.forEach((pos, index) => {
                const leg = document.createElement('div');
                leg.style.position = 'absolute';
                leg.style.width = '15%';
                leg.style.height = '25%';
                leg.style.backgroundColor = '#CD853F';
                leg.style.borderRadius = '40% 40% 20% 20%';
                leg.style.bottom = pos.bottom;

                if (pos.left) leg.style.left = pos.left;
                if (pos.right) leg.style.right = pos.right;

                leg.style.transform = `translateZ(-2px) rotate(${pos.rotation}deg)`;
                leg.style.transformOrigin = 'top center';
                leg.style.boxShadow = '0 2px 3px rgba(0,0,0,0.2)';
                body.appendChild(leg);

                // Add foot
                const foot = document.createElement('div');
                foot.style.position = 'absolute';
                foot.style.width = '120%';
                foot.style.height = '25%';
                foot.style.backgroundColor = '#8B4513';
                foot.style.borderRadius = '40% 40% 20% 20%';
                foot.style.bottom = '-20%';
                foot.style.left = '-10%';
                leg.appendChild(foot);
            });

            // Add animation
            const keyframes = `
                @keyframes herbivoreWalk${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) translateY(0); }
                    50% { transform: translateZ(${organism.heightOffset}px) translateY(-2px); }
                    100% { transform: translateZ(${organism.heightOffset}px) translateY(0); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `herbivoreWalk${organism.id} 1s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },
    omnivore: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create a main body
            body.style.backgroundColor = '#4169E1';
            body.style.borderRadius = '60% 60% 55% 55% / 60% 60% 50% 50%';
            body.style.boxShadow = '0 7px 12px rgba(0,0,0,0.3)';

            // Add body markings
            const marking = document.createElement('div');
            marking.style.position = 'absolute';
            marking.style.width = '60%';
            marking.style.height = '50%';
            marking.style.backgroundColor = '#6495ED';
            marking.style.borderRadius = '50%';
            marking.style.top = '20%';
            marking.style.left = '20%';
            marking.style.transform = 'translateZ(1px)';
            body.appendChild(marking);

            // Add head
            const head = document.createElement('div');
            head.style.position = 'absolute';
            head.style.width = '60%';
            head.style.height = '55%';
            head.style.backgroundColor = '#4169E1';
            head.style.borderRadius = '50% 50% 40% 40%';
            head.style.top = '-25%';
            head.style.left = '20%';
            head.style.zIndex = '3';
            head.style.transform = 'translateZ(8px)';
            head.style.boxShadow = '0 -3px 6px rgba(0,0,0,0.2)';
            body.appendChild(head);

            // Add eyes
            const leftEye = document.createElement('div');
            leftEye.style.position = 'absolute';
            leftEye.style.width = '22%';
            leftEye.style.height = '22%';
            leftEye.style.backgroundColor = 'white';
            leftEye.style.borderRadius = '50%';
            leftEye.style.top = '30%';
            leftEye.style.left = '20%';
            leftEye.style.transform = 'translateZ(2px)';
            leftEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(leftEye);

            const rightEye = document.createElement('div');
            rightEye.style.position = 'absolute';
            rightEye.style.width = '22%';
            rightEye.style.height = '22%';
            rightEye.style.backgroundColor = 'white';
            rightEye.style.borderRadius = '50%';
            rightEye.style.top = '30%';
            rightEye.style.right = '20%';
            rightEye.style.transform = 'translateZ(2px)';
            rightEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(rightEye);

            // Add pupils
            const leftPupil = document.createElement('div');
            leftPupil.style.position = 'absolute';
            leftPupil.style.width = '45%';
            leftPupil.style.height = '45%';
            leftPupil.style.backgroundColor = 'black';
            leftPupil.style.borderRadius = '50%';
            leftPupil.style.top = '30%';
            leftPupil.style.left = '30%';
            leftPupil.style.transform = 'translateZ(1px)';
            leftEye.appendChild(leftPupil);

            const rightPupil = document.createElement('div');
            rightPupil.style.position = 'absolute';
            rightPupil.style.width = '45%';
            rightPupil.style.height = '45%';
            rightPupil.style.backgroundColor = 'black';
            rightPupil.style.borderRadius = '50%';
            rightPupil.style.top = '30%';
            rightPupil.style.left = '30%';
            rightPupil.style.transform = 'translateZ(1px)';
            rightEye.appendChild(rightPupil);

            // Add ears
            const leftEar = document.createElement('div');
            leftEar.style.position = 'absolute';
            leftEar.style.width = '35%';
            leftEar.style.height = '45%';
            leftEar.style.backgroundColor = '#4169E1';
            leftEar.style.borderRadius = '70% 70% 20% 20%';
            leftEar.style.top = '-35%';
            leftEar.style.left = '5%';
            leftEar.style.transform = 'translateZ(-1px) rotate(-10deg)';
            leftEar.style.transformOrigin = 'bottom center';
            leftEar.style.boxShadow = '-1px -1px 3px rgba(0,0,0,0.2)';
            head.appendChild(leftEar);

            // Inner ear detail
            const leftInnerEar = document.createElement('div');
            leftInnerEar.style.position = 'absolute';
            leftInnerEar.style.width = '60%';
            leftInnerEar.style.height = '60%';
            leftInnerEar.style.backgroundColor = '#6495ED';
            leftInnerEar.style.borderRadius = '70% 70% 20% 20%';
            leftInnerEar.style.top = '15%';
            leftInnerEar.style.left = '20%';
            leftEar.appendChild(leftInnerEar);

            const rightEar = document.createElement('div');
            rightEar.style.position = 'absolute';
            rightEar.style.width = '35%';
            rightEar.style.height = '45%';
            rightEar.style.backgroundColor = '#4169E1';
            rightEar.style.borderRadius = '70% 70% 20% 20%';
            rightEar.style.top = '-35%';
            rightEar.style.right = '5%';
            rightEar.style.transform = 'translateZ(-1px) rotate(10deg)';
            rightEar.style.transformOrigin = 'bottom center';
            rightEar.style.boxShadow = '1px -1px 3px rgba(0,0,0,0.2)';
            head.appendChild(rightEar);

            // Inner ear detail
            const rightInnerEar = document.createElement('div');
            rightInnerEar.style.position = 'absolute';
            rightInnerEar.style.width = '60%';
            rightInnerEar.style.height = '60%';
            rightInnerEar.style.backgroundColor = '#6495ED';
            rightInnerEar.style.borderRadius = '70% 70% 20% 20%';
            rightInnerEar.style.top = '15%';
            rightInnerEar.style.left = '20%';
            rightEar.appendChild(rightInnerEar);

            // Add nose and mouth
            const snout = document.createElement('div');
            snout.style.position = 'absolute';
            snout.style.width = '40%';
            snout.style.height = '30%';
            snout.style.backgroundColor = '#6495ED';
            snout.style.borderRadius = '40% 40% 60% 60%';
            snout.style.bottom = '10%';
            snout.style.left = '30%';
            snout.style.transform = 'translateZ(3px)';
            head.appendChild(snout);

            const nose = document.createElement('div');
            nose.style.position = 'absolute';
            nose.style.width = '50%';
            nose.style.height = '30%';
            nose.style.backgroundColor = '#5A5A5A';
            nose.style.borderRadius = '40%';
            nose.style.top = '20%';
            nose.style.left = '25%';
            nose.style.transform = 'translateZ(1px)';
            snout.appendChild(nose);

            // Add limbs
            const limbs = [
                { type: 'arm', bottom: '30%', left: '0%', rotation: -20 },
                { type: 'arm', bottom: '30%', right: '0%', rotation: 20 },
                { type: 'leg', bottom: '0%', left: '15%', rotation: -5 },
                { type: 'leg', bottom: '0%', right: '15%', rotation: 5 }
            ];

            limbs.forEach(limb => {
                const element = document.createElement('div');
                element.style.position = 'absolute';

                if (limb.type === 'arm') {
                    element.style.width = '15%';
                    element.style.height = '30%';
                } else {
                    element.style.width = '18%';
                    element.style.height = '25%';
                }

                element.style.backgroundColor = '#4169E1';
                element.style.borderRadius = '40% 40% 20% 20%';
                element.style.bottom = limb.bottom;

                if (limb.left) element.style.left = limb.left;
                if (limb.right) element.style.right = limb.right;

                element.style.transform = `translateZ(-2px) rotate(${limb.rotation}deg)`;
                element.style.transformOrigin = 'top center';
                element.style.boxShadow = '0 2px 3px rgba(0,0,0,0.2)';
                body.appendChild(element);

                // Add hand or foot
                const extremity = document.createElement('div');
                extremity.style.position = 'absolute';

                if (limb.type === 'arm') {
                    extremity.style.width = '120%';
                    extremity.style.height = '25%';
                    extremity.style.bottom = '-20%';
                } else {
                    extremity.style.width = '130%';
                    extremity.style.height = '20%';
                    extremity.style.bottom = '-15%';
                }

                extremity.style.backgroundColor = limb.type === 'arm' ? '#6495ED' : '#4682B4';
                extremity.style.borderRadius = '40% 40% 20% 20%';
                extremity.style.left = '-15%';
                element.appendChild(extremity);
            });

            // Add tail
            const tail = document.createElement('div');
            tail.style.position = 'absolute';
            tail.style.width = '15%';
            tail.style.height = '30%';
            tail.style.backgroundColor = '#4169E1';
            tail.style.borderRadius = '40% 40% 20% 20%';
            tail.style.bottom = '10%';
            tail.style.left = '-5%';
            tail.style.transform = 'translateZ(-3px) rotate(-30deg)';
            tail.style.transformOrigin = 'top right';
            body.appendChild(tail);

            // Add animation
            const keyframes = `
                @keyframes omnivoreMove${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) translateY(0); }
                    25% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(-1deg); }
                    75% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(1deg); }
                    100% { transform: translateZ(${organism.heightOffset}px) translateY(0); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `omnivoreMove${organism.id} 1.5s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },
    CARD_WHITETAILED_DEER: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create deer body - elegant and elongated
            body.style.backgroundColor = '#D2B48C'; // Sandy brown
            body.style.borderRadius = '50% 50% 45% 45% / 70% 70% 30% 30%';
            body.style.boxShadow = '0 8px 15px rgba(0,0,0,0.3)';

            // Add white spotted pattern
            const spots = [
                { top: '20%', left: '15%', size: '8%' },
                { top: '35%', left: '25%', size: '6%' },
                { top: '25%', right: '20%', size: '7%' },
                { top: '45%', right: '15%', size: '5%' }
            ];

            spots.forEach(spot => {
                const spotElement = document.createElement('div');
                spotElement.style.position = 'absolute';
                spotElement.style.width = spot.size;
                spotElement.style.height = spot.size;
                spotElement.style.backgroundColor = '#F5F5DC'; // Beige spots
                spotElement.style.borderRadius = '50%';
                spotElement.style.top = spot.top;
                if (spot.left) spotElement.style.left = spot.left;
                if (spot.right) spotElement.style.right = spot.right;
                spotElement.style.opacity = '0.7';
                body.appendChild(spotElement);
            });

            // Add elongated deer head
            const head = document.createElement('div');
            head.style.position = 'absolute';
            head.style.width = '45%';
            head.style.height = '60%';
            head.style.backgroundColor = '#D2B48C';
            head.style.borderRadius = '60% 60% 40% 40%';
            head.style.top = '-30%';
            head.style.left = '27.5%';
            head.style.zIndex = '3';
            head.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.1)';
            head.style.transform = 'translateZ(5px)';
            body.appendChild(head);

            // Add distinctive deer antlers - branching structure
            const leftAntler = document.createElement('div');
            leftAntler.style.position = 'absolute';
            leftAntler.style.width = '3px';
            leftAntler.style.height = '40px';
            leftAntler.style.backgroundColor = '#8B4513'; // Brown
            leftAntler.style.top = '-35px';
            leftAntler.style.left = '25%';
            leftAntler.style.transform = 'rotate(-10deg)';
            leftAntler.style.transformOrigin = 'bottom center';
            head.appendChild(leftAntler);

            // Add antler branches
            const leftBranch1 = document.createElement('div');
            leftBranch1.style.position = 'absolute';
            leftBranch1.style.width = '2px';
            leftBranch1.style.height = '20px';
            leftBranch1.style.backgroundColor = '#8B4513';
            leftBranch1.style.top = '5px';
            leftBranch1.style.left = '-1px';
            leftBranch1.style.transform = 'rotate(-30deg)';
            leftBranch1.style.transformOrigin = 'bottom center';
            leftAntler.appendChild(leftBranch1);

            const leftBranch2 = document.createElement('div');
            leftBranch2.style.position = 'absolute';
            leftBranch2.style.width = '2px';
            leftBranch2.style.height = '15px';
            leftBranch2.style.backgroundColor = '#8B4513';
            leftBranch2.style.top = '15px';
            leftBranch2.style.right = '-1px';
            leftBranch2.style.transform = 'rotate(25deg)';
            leftBranch2.style.transformOrigin = 'bottom center';
            leftAntler.appendChild(leftBranch2);

            const rightAntler = document.createElement('div');
            rightAntler.style.position = 'absolute';
            rightAntler.style.width = '3px';
            rightAntler.style.height = '40px';
            rightAntler.style.backgroundColor = '#8B4513';
            rightAntler.style.top = '-35px';
            rightAntler.style.right = '25%';
            rightAntler.style.transform = 'rotate(10deg)';
            rightAntler.style.transformOrigin = 'bottom center';
            head.appendChild(rightAntler);

            // Add right antler branches
            const rightBranch1 = document.createElement('div');
            rightBranch1.style.position = 'absolute';
            rightBranch1.style.width = '2px';
            rightBranch1.style.height = '20px';
            rightBranch1.style.backgroundColor = '#8B4513';
            rightBranch1.style.top = '5px';
            rightBranch1.style.right = '-1px';
            rightBranch1.style.transform = 'rotate(30deg)';
            rightBranch1.style.transformOrigin = 'bottom center';
            rightAntler.appendChild(rightBranch1);

            const rightBranch2 = document.createElement('div');
            rightBranch2.style.position = 'absolute';
            rightBranch2.style.width = '2px';
            rightBranch2.style.height = '15px';
            rightBranch2.style.backgroundColor = '#8B4513';
            rightBranch2.style.top = '15px';
            rightBranch2.style.left = '-1px';
            rightBranch2.style.transform = 'rotate(-25deg)';
            rightBranch2.style.transformOrigin = 'bottom center';
            rightAntler.appendChild(rightBranch2);

            // Add large, alert deer eyes
            const leftEye = document.createElement('div');
            leftEye.style.position = 'absolute';
            leftEye.style.width = '25%';
            leftEye.style.height = '25%';
            leftEye.style.backgroundColor = 'white';
            leftEye.style.borderRadius = '50%';
            leftEye.style.top = '35%';
            leftEye.style.left = '20%';
            leftEye.style.transform = 'translateZ(2px)';
            leftEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(leftEye);

            const rightEye = document.createElement('div');
            rightEye.style.position = 'absolute';
            rightEye.style.width = '25%';
            rightEye.style.height = '25%';
            rightEye.style.backgroundColor = 'white';
            rightEye.style.borderRadius = '50%';
            rightEye.style.top = '35%';
            rightEye.style.right = '20%';
            rightEye.style.transform = 'translateZ(2px)';
            rightEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(rightEye);

            // Add pupils
            const leftPupil = document.createElement('div');
            leftPupil.style.position = 'absolute';
            leftPupil.style.width = '40%';
            leftPupil.style.height = '40%';
            leftPupil.style.backgroundColor = 'black';
            leftPupil.style.borderRadius = '50%';
            leftPupil.style.top = '30%';
            leftPupil.style.left = '30%';
            leftPupil.style.transform = 'translateZ(1px)';
            leftEye.appendChild(leftPupil);

            const rightPupil = document.createElement('div');
            rightPupil.style.position = 'absolute';
            rightPupil.style.width = '40%';
            rightPupil.style.height = '40%';
            rightPupil.style.backgroundColor = 'black';
            rightPupil.style.borderRadius = '50%';
            rightPupil.style.top = '30%';
            rightPupil.style.left = '30%';
            rightPupil.style.transform = 'translateZ(1px)';
            rightEye.appendChild(rightPupil);

            // Add elongated snout
            const snout = document.createElement('div');
            snout.style.position = 'absolute';
            snout.style.width = '30%';
            snout.style.height = '35%';
            snout.style.backgroundColor = '#D2B48C';
            snout.style.borderRadius = '40% 40% 60% 60%';
            snout.style.bottom = '10%';
            snout.style.left = '35%';
            snout.style.transform = 'translateZ(3px)';
            head.appendChild(snout);

            // Add black nose
            const nose = document.createElement('div');
            nose.style.position = 'absolute';
            nose.style.width = '50%';
            nose.style.height = '30%';
            nose.style.backgroundColor = '#000000';
            nose.style.borderRadius = '50%';
            nose.style.bottom = '15%';
            nose.style.left = '25%';
            nose.style.transform = 'translateZ(1px)';
            snout.appendChild(nose);

            // Add slender deer legs
            const legPositions = [
                { bottom: '0%', left: '15%', rotation: -3 },
                { bottom: '0%', left: '35%', rotation: 0 },
                { bottom: '0%', right: '35%', rotation: 0 },
                { bottom: '0%', right: '15%', rotation: 3 }
            ];

            legPositions.forEach((pos) => {
                const leg = document.createElement('div');
                leg.style.position = 'absolute';
                leg.style.width = '8%'; // Very slender legs
                leg.style.height = '35%'; // Longer legs
                leg.style.backgroundColor = '#D2B48C';
                leg.style.borderRadius = '40% 40% 20% 20%';
                leg.style.bottom = pos.bottom;

                if (pos.left) leg.style.left = pos.left;
                if (pos.right) leg.style.right = pos.right;

                leg.style.transform = `translateZ(-2px) rotate(${pos.rotation}deg)`;
                leg.style.transformOrigin = 'top center';
                leg.style.boxShadow = '0 2px 3px rgba(0,0,0,0.2)';
                body.appendChild(leg);

                // Add hooves
                const hoof = document.createElement('div');
                hoof.style.position = 'absolute';
                hoof.style.width = '120%';
                hoof.style.height = '20%';
                hoof.style.backgroundColor = '#2F2F2F';
                hoof.style.borderRadius = '40% 40% 20% 20%';
                hoof.style.bottom = '-15%';
                hoof.style.left = '-10%';
                leg.appendChild(hoof);
            });

            // Add short deer tail
            const tail = document.createElement('div');
            tail.style.position = 'absolute';
            tail.style.width = '8%';
            tail.style.height = '15%';
            tail.style.backgroundColor = '#D2B48C';
            tail.style.borderRadius = '50%';
            tail.style.bottom = '20%';
            tail.style.left = '-3%';
            tail.style.transform = 'translateZ(-3px) rotate(-15deg)';
            tail.style.transformOrigin = 'top right';
            body.appendChild(tail);

            // Add animation - graceful movement
            const keyframes = `
                @keyframes deerMove${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg); }
                    50% { transform: translateZ(${organism.heightOffset}px) translateY(-3px) rotate(0deg); }
                    100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `deerMove${organism.id} 2s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },
    CARD_GRAY_WOLF: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create wolf body - robust and powerful
            body.style.backgroundColor = '#4A4A4A'; // Medium gray
            body.style.borderRadius = '45% 45% 50% 50% / 60% 60% 40% 40%';
            body.style.boxShadow = '0 8px 15px rgba(0,0,0,0.4)';
            body.style.position = 'relative';

            // Add chest marking
            const chest = document.createElement('div');
            chest.style.position = 'absolute';
            chest.style.width = '50%';
            chest.style.height = '60%';
            chest.style.backgroundColor = '#D3D3D3'; // Light gray
            chest.style.borderRadius = '50%';
            chest.style.bottom = '15%';
            chest.style.left = '25%';
            chest.style.zIndex = '2';
            body.appendChild(chest);

            // Add wolf head - more dog-like proportions
            const head = document.createElement('div');
            head.style.position = 'absolute';
            head.style.width = '60%';
            head.style.height = '50%';
            head.style.backgroundColor = '#4A4A4A';
            head.style.borderRadius = '50% 50% 40% 40%';
            head.style.top = '-20%';
            head.style.left = '20%';
            head.style.zIndex = '3';
            head.style.transform = 'translateZ(5px)';
            head.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.2)';
            body.appendChild(head);

            // Add wolf ears - more rounded
            const leftEar = document.createElement('div');
            leftEar.style.position = 'absolute';
            leftEar.style.width = '30%';
            leftEar.style.height = '40%';
            leftEar.style.backgroundColor = '#4A4A4A';
            leftEar.style.borderRadius = '60% 60% 20% 20%';
            leftEar.style.top = '-30%';
            leftEar.style.left = '15%';
            leftEar.style.transform = 'translateZ(-1px) rotate(-15deg)';
            leftEar.style.transformOrigin = 'bottom center';
            leftEar.style.boxShadow = '-1px -1px 3px rgba(0,0,0,0.2)';
            head.appendChild(leftEar);

            // Inner ear
            const leftInnerEar = document.createElement('div');
            leftInnerEar.style.position = 'absolute';
            leftInnerEar.style.width = '60%';
            leftInnerEar.style.height = '60%';
            leftInnerEar.style.backgroundColor = '#2F2F2F';
            leftInnerEar.style.borderRadius = '60% 60% 20% 20%';
            leftInnerEar.style.top = '15%';
            leftInnerEar.style.left = '20%';
            leftEar.appendChild(leftInnerEar);

            const rightEar = document.createElement('div');
            rightEar.style.position = 'absolute';
            rightEar.style.width = '30%';
            rightEar.style.height = '40%';
            rightEar.style.backgroundColor = '#4A4A4A';
            rightEar.style.borderRadius = '60% 60% 20% 20%';
            rightEar.style.top = '-30%';
            rightEar.style.right = '15%';
            rightEar.style.transform = 'translateZ(-1px) rotate(15deg)';
            rightEar.style.transformOrigin = 'bottom center';
            rightEar.style.boxShadow = '1px -1px 3px rgba(0,0,0,0.2)';
            head.appendChild(rightEar);

            // Inner ear
            const rightInnerEar = document.createElement('div');
            rightInnerEar.style.position = 'absolute';
            rightInnerEar.style.width = '60%';
            rightInnerEar.style.height = '60%';
            rightInnerEar.style.backgroundColor = '#2F2F2F';
            rightInnerEar.style.borderRadius = '60% 60% 20% 20%';
            rightInnerEar.style.top = '15%';
            rightInnerEar.style.left = '20%';
            rightEar.appendChild(rightInnerEar);

            // Add wolf eyes - amber colored
            const leftEye = document.createElement('div');
            leftEye.style.position = 'absolute';
            leftEye.style.width = '22%';
            leftEye.style.height = '22%';
            leftEye.style.backgroundColor = '#FFA500'; // Orange/amber
            leftEye.style.borderRadius = '50%';
            leftEye.style.top = '35%';
            leftEye.style.left = '20%';
            leftEye.style.transform = 'translateZ(2px)';
            leftEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(leftEye);

            const rightEye = document.createElement('div');
            rightEye.style.position = 'absolute';
            rightEye.style.width = '22%';
            rightEye.style.height = '22%';
            rightEye.style.backgroundColor = '#FFA500';
            rightEye.style.borderRadius = '50%';
            rightEye.style.top = '35%';
            rightEye.style.right = '20%';
            rightEye.style.transform = 'translateZ(2px)';
            rightEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(rightEye);

            // Add pupils
            const leftPupil = document.createElement('div');
            leftPupil.style.position = 'absolute';
            leftPupil.style.width = '40%';
            leftPupil.style.height = '40%';
            leftPupil.style.backgroundColor = 'black';
            leftPupil.style.borderRadius = '50%';
            leftPupil.style.top = '30%';
            leftPupil.style.left = '30%';
            leftPupil.style.transform = 'translateZ(1px)';
            leftEye.appendChild(leftPupil);

            const rightPupil = document.createElement('div');
            rightPupil.style.position = 'absolute';
            rightPupil.style.width = '40%';
            rightPupil.style.height = '40%';
            rightPupil.style.backgroundColor = 'black';
            rightPupil.style.borderRadius = '50%';
            rightPupil.style.top = '30%';
            rightPupil.style.left = '30%';
            rightPupil.style.transform = 'translateZ(1px)';
            rightEye.appendChild(rightPupil);

            // Add snout
            const snout = document.createElement('div');
            snout.style.position = 'absolute';
            snout.style.width = '35%';
            snout.style.height = '35%';
            snout.style.backgroundColor = '#4A4A4A';
            snout.style.borderRadius = '40% 40% 60% 60%';
            snout.style.bottom = '15%';
            snout.style.left = '32.5%';
            snout.style.transform = 'translateZ(3px)';
            head.appendChild(snout);

            // Add nose
            const nose = document.createElement('div');
            nose.style.position = 'absolute';
            nose.style.width = '50%';
            nose.style.height = '30%';
            nose.style.backgroundColor = '#000000';
            nose.style.borderRadius = '50%';
            nose.style.bottom = '20%';
            nose.style.left = '25%';
            nose.style.transform = 'translateZ(1px)';
            snout.appendChild(nose);

            // Add legs - four legs for stability
            const legPositions = [
                { bottom: '0%', left: '15%', rotation: -5 },
                { bottom: '0%', left: '35%', rotation: 0 },
                { bottom: '0%', right: '35%', rotation: 0 },
                { bottom: '0%', right: '15%', rotation: 5 }
            ];

            legPositions.forEach((pos) => {
                const leg = document.createElement('div');
                leg.style.position = 'absolute';
                leg.style.width = '14%';
                leg.style.height = '30%';
                leg.style.backgroundColor = '#4A4A4A';
                leg.style.borderRadius = '40% 40% 20% 20%';
                leg.style.bottom = pos.bottom;

                if (pos.left) leg.style.left = pos.left;
                if (pos.right) leg.style.right = pos.right;

                leg.style.transform = `translateZ(-2px) rotate(${pos.rotation}deg)`;
                leg.style.transformOrigin = 'top center';
                leg.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                body.appendChild(leg);

                // Add paws
                const paw = document.createElement('div');
                paw.style.position = 'absolute';
                paw.style.width = '120%';
                paw.style.height = '25%';
                paw.style.backgroundColor = '#2F2F2F';
                paw.style.borderRadius = '40% 40% 20% 20%';
                paw.style.bottom = '-20%';
                paw.style.left = '-10%';
                leg.appendChild(paw);
            });

            // Add tail
            const tail = document.createElement('div');
            tail.style.position = 'absolute';
            tail.style.width = '18%';
            tail.style.height = '40%';
            tail.style.backgroundColor = '#4A4A4A';
            tail.style.borderRadius = '40% 40% 30% 30%';
            tail.style.bottom = '15%';
            tail.style.left = '-8%';
            tail.style.transform = 'translateZ(-3px) rotate(-25deg)';
            tail.style.transformOrigin = 'top right';
            body.appendChild(tail);

            // Add animation
            const keyframes = `
                @keyframes wolfMove${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg); }
                    50% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(0deg); }
                    100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `wolfMove${organism.id} 2s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },
    CARD_HOUSE_MOUSE: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create tiny mouse body
            body.style.backgroundColor = '#8B4513'; // Brown
            body.style.borderRadius = '60% 60% 40% 40% / 70% 70% 30% 30%';
            body.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';

            // Add lighter belly
            const belly = document.createElement('div');
            belly.style.position = 'absolute';
            belly.style.width = '60%';
            belly.style.height = '50%';
            belly.style.backgroundColor = '#D2B48C'; // Light brown
            belly.style.borderRadius = '50%';
            belly.style.bottom = '10%';
            belly.style.left = '20%';
            belly.style.zIndex = '2';
            body.appendChild(belly);

            // Add small mouse head
            const head = document.createElement('div');
            head.style.position = 'absolute';
            head.style.width = '50%';
            head.style.height = '45%';
            head.style.backgroundColor = '#8B4513';
            head.style.borderRadius = '65% 65% 45% 45%';
            head.style.top = '-20%';
            head.style.left = '25%';
            head.style.zIndex = '3';
            head.style.boxShadow = '0 -1px 3px rgba(0,0,0,0.1)';
            head.style.transform = 'translateZ(5px)';
            body.appendChild(head);

            // Add large round mouse ears
            const leftEar = document.createElement('div');
            leftEar.style.position = 'absolute';
            leftEar.style.width = '35%';
            leftEar.style.height = '35%';
            leftEar.style.backgroundColor = '#8B4513';
            leftEar.style.borderRadius = '50%';
            leftEar.style.top = '-25%';
            leftEar.style.left = '10%';
            leftEar.style.transform = 'translateZ(-1px)';
            leftEar.style.boxShadow = '-1px -1px 2px rgba(0,0,0,0.2)';
            head.appendChild(leftEar);

            // Inner ear detail
            const leftInnerEar = document.createElement('div');
            leftInnerEar.style.position = 'absolute';
            leftInnerEar.style.width = '60%';
            leftInnerEar.style.height = '60%';
            leftInnerEar.style.backgroundColor = '#FFB6C1'; // Pink
            leftInnerEar.style.borderRadius = '50%';
            leftInnerEar.style.top = '20%';
            leftInnerEar.style.left = '20%';
            leftEar.appendChild(leftInnerEar);

            const rightEar = document.createElement('div');
            rightEar.style.position = 'absolute';
            rightEar.style.width = '35%';
            rightEar.style.height = '35%';
            rightEar.style.backgroundColor = '#8B4513';
            rightEar.style.borderRadius = '50%';
            rightEar.style.top = '-25%';
            rightEar.style.right = '10%';
            rightEar.style.transform = 'translateZ(-1px)';
            rightEar.style.boxShadow = '1px -1px 2px rgba(0,0,0,0.2)';
            head.appendChild(rightEar);

            // Inner ear detail
            const rightInnerEar = document.createElement('div');
            rightInnerEar.style.position = 'absolute';
            rightInnerEar.style.width = '60%';
            rightInnerEar.style.height = '60%';
            rightInnerEar.style.backgroundColor = '#FFB6C1';
            rightInnerEar.style.borderRadius = '50%';
            rightInnerEar.style.top = '20%';
            rightInnerEar.style.left = '20%';
            rightEar.appendChild(rightInnerEar);

            // Add small beady mouse eyes
            const leftEye = document.createElement('div');
            leftEye.style.position = 'absolute';
            leftEye.style.width = '20%';
            leftEye.style.height = '20%';
            leftEye.style.backgroundColor = 'black';
            leftEye.style.borderRadius = '50%';
            leftEye.style.top = '35%';
            leftEye.style.left = '25%';
            leftEye.style.transform = 'translateZ(2px)';
            leftEye.style.boxShadow = '0 1px 2px rgba(255,255,255,0.3) inset';
            head.appendChild(leftEye);

            const rightEye = document.createElement('div');
            rightEye.style.position = 'absolute';
            rightEye.style.width = '20%';
            rightEye.style.height = '20%';
            rightEye.style.backgroundColor = 'black';
            rightEye.style.borderRadius = '50%';
            rightEye.style.top = '35%';
            rightEye.style.right = '25%';
            rightEye.style.transform = 'translateZ(2px)';
            rightEye.style.boxShadow = '0 1px 2px rgba(255,255,255,0.3) inset';
            head.appendChild(rightEye);

            // Add tiny pointed snout
            const snout = document.createElement('div');
            snout.style.position = 'absolute';
            snout.style.width = '25%';
            snout.style.height = '25%';
            snout.style.backgroundColor = '#8B4513';
            snout.style.borderRadius = '40% 40% 70% 70%';
            snout.style.bottom = '15%';
            snout.style.left = '37.5%';
            snout.style.transform = 'translateZ(3px)';
            head.appendChild(snout);

            // Add tiny pink nose
            const nose = document.createElement('div');
            nose.style.position = 'absolute';
            nose.style.width = '40%';
            nose.style.height = '30%';
            nose.style.backgroundColor = '#FFB6C1';
            nose.style.borderRadius = '50%';
            nose.style.bottom = '20%';
            nose.style.left = '30%';
            nose.style.transform = 'translateZ(1px)';
            snout.appendChild(nose);

            // Add tiny mouse legs
            const legPositions = [
                { bottom: '0%', left: '25%', rotation: -5 },
                { bottom: '0%', right: '25%', rotation: 5 },
            ];

            legPositions.forEach((pos) => {
                const leg = document.createElement('div');
                leg.style.position = 'absolute';
                leg.style.width = '10%'; // Very tiny legs
                leg.style.height = '20%';
                leg.style.backgroundColor = '#8B4513';
                leg.style.borderRadius = '40% 40% 20% 20%';
                leg.style.bottom = pos.bottom;

                if (pos.left) leg.style.left = pos.left;
                if (pos.right) leg.style.right = pos.right;

                leg.style.transform = `translateZ(-2px) rotate(${pos.rotation}deg)`;
                leg.style.transformOrigin = 'top center';
                leg.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';
                body.appendChild(leg);

                // Add tiny paws
                const paw = document.createElement('div');
                paw.style.position = 'absolute';
                paw.style.width = '120%';
                paw.style.height = '25%';
                paw.style.backgroundColor = '#D2B48C';
                paw.style.borderRadius = '50%';
                paw.style.bottom = '-20%';
                paw.style.left = '-10%';
                leg.appendChild(paw);
            });

            // Add long thin mouse tail
            const tail = document.createElement('div');
            tail.style.position = 'absolute';
            tail.style.width = '3%'; // Very thin
            tail.style.height = '60%'; // Very long
            tail.style.backgroundColor = '#8B4513';
            tail.style.borderRadius = '50%';
            tail.style.bottom = '10%';
            tail.style.left = '-2%';
            tail.style.transform = 'translateZ(-3px) rotate(-35deg)';
            tail.style.transformOrigin = 'top right';
            tail.style.boxShadow = '0 2px 3px rgba(0,0,0,0.2)';
            body.appendChild(tail);

            // Add tail curve
            const tailCurve = document.createElement('div');
            tailCurve.style.position = 'absolute';
            tailCurve.style.width = '3px';
            tailCurve.style.height = '20px';
            tailCurve.style.backgroundColor = '#8B4513';
            tailCurve.style.borderRadius = '50%';
            tailCurve.style.top = '0%';
            tailCurve.style.left = '-1px';
            tailCurve.style.transform = 'rotate(45deg)';
            tailCurve.style.transformOrigin = 'bottom center';
            tail.appendChild(tailCurve);

            // Add animation - quick scurrying movement
            const keyframes = `
                @keyframes mouseScurry${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) translateY(0) translateX(0); }
                    25% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) translateX(1px); }
                    50% { transform: translateZ(${organism.heightOffset}px) translateY(0) translateX(0); }
                    75% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) translateX(-1px); }
                    100% { transform: translateZ(${organism.heightOffset}px) translateY(0) translateX(0); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `mouseScurry${organism.id} 0.6s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },
    CARD_DESERT_LIZARD: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override only the circular styling, keep everything else
            body.style.borderRadius = '0'; // Remove circular shape
            body.style.boxShadow = 'none'; // Remove circular border shadow
            body.style.backgroundColor = 'transparent'; // Remove background

            // Use lizard emoji - simple and perfect (original settings)
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Lizard emoji
            body.textContent = '🦎';

            // Add subtle animation (original)
            const keyframes = `
                @keyframes lizardMove${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                    25% { transform: translateZ(${organism.heightOffset}px) rotate(-2deg) scale(1.05); }
                    75% { transform: translateZ(${organism.heightOffset}px) rotate(2deg) scale(0.95); }
                    100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `lizardMove${organism.id} 2.5s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },
    CARD_EUROPEAN_RABBIT: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create rabbit body - more oval and fluffy
            body.style.backgroundColor = '#D2B48C'; // Sandy brown
            body.style.borderRadius = '65% 65% 45% 45% / 75% 75% 35% 35%';
            body.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';

            // Add fluffy chest marking
            const chest = document.createElement('div');
            chest.style.position = 'absolute';
            chest.style.width = '50%';
            chest.style.height = '60%';
            chest.style.backgroundColor = '#F5F5DC'; // Beige
            chest.style.borderRadius = '50%';
            chest.style.bottom = '15%';
            chest.style.left = '25%';
            chest.style.zIndex = '2';
            body.appendChild(chest);

            // Add head that's more rounded
            const head = document.createElement('div');
            head.style.position = 'absolute';
            head.style.width = '55%';
            head.style.height = '50%';
            head.style.backgroundColor = '#D2B48C';
            head.style.borderRadius = '70% 70% 50% 50%';
            head.style.top = '-20%';
            head.style.left = '22.5%';
            head.style.zIndex = '3';
            head.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.1)';
            head.style.transform = 'translateZ(5px)';
            body.appendChild(head);

            // Add distinctive long rabbit ears
            const leftEar = document.createElement('div');
            leftEar.style.position = 'absolute';
            leftEar.style.width = '25%';
            leftEar.style.height = '60%'; // Much longer than other animals
            leftEar.style.backgroundColor = '#D2B48C';
            leftEar.style.borderRadius = '60% 60% 20% 20%';
            leftEar.style.top = '-45%'; // Higher up
            leftEar.style.left = '15%';
            leftEar.style.transform = 'translateZ(-1px) rotate(-15deg)';
            leftEar.style.transformOrigin = 'bottom center';
            leftEar.style.boxShadow = '-1px -1px 3px rgba(0,0,0,0.2)';
            head.appendChild(leftEar);

            // Inner ear detail
            const leftInnerEar = document.createElement('div');
            leftInnerEar.style.position = 'absolute';
            leftInnerEar.style.width = '60%';
            leftInnerEar.style.height = '70%';
            leftInnerEar.style.backgroundColor = '#FFB6C1'; // Light pink
            leftInnerEar.style.borderRadius = '60% 60% 20% 20%';
            leftInnerEar.style.top = '10%';
            leftInnerEar.style.left = '20%';
            leftEar.appendChild(leftInnerEar);

            const rightEar = document.createElement('div');
            rightEar.style.position = 'absolute';
            rightEar.style.width = '25%';
            rightEar.style.height = '60%';
            rightEar.style.backgroundColor = '#D2B48C';
            rightEar.style.borderRadius = '60% 60% 20% 20%';
            rightEar.style.top = '-45%';
            rightEar.style.right = '15%';
            rightEar.style.transform = 'translateZ(-1px) rotate(15deg)';
            rightEar.style.transformOrigin = 'bottom center';
            rightEar.style.boxShadow = '1px -1px 3px rgba(0,0,0,0.2)';
            head.appendChild(rightEar);

            // Inner ear detail
            const rightInnerEar = document.createElement('div');
            rightInnerEar.style.position = 'absolute';
            rightInnerEar.style.width = '60%';
            rightInnerEar.style.height = '70%';
            rightInnerEar.style.backgroundColor = '#FFB6C1';
            rightInnerEar.style.borderRadius = '60% 60% 20% 20%';
            rightInnerEar.style.top = '10%';
            rightInnerEar.style.left = '20%';
            rightEar.appendChild(rightInnerEar);

            // Add large rabbit eyes
            const leftEye = document.createElement('div');
            leftEye.style.position = 'absolute';
            leftEye.style.width = '28%'; // Larger than other animals
            leftEye.style.height = '28%';
            leftEye.style.backgroundColor = 'white';
            leftEye.style.borderRadius = '50%';
            leftEye.style.top = '25%';
            leftEye.style.left = '15%';
            leftEye.style.transform = 'translateZ(2px)';
            leftEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(leftEye);

            const rightEye = document.createElement('div');
            rightEye.style.position = 'absolute';
            rightEye.style.width = '28%';
            rightEye.style.height = '28%';
            rightEye.style.backgroundColor = 'white';
            rightEye.style.borderRadius = '50%';
            rightEye.style.top = '25%';
            rightEye.style.right = '15%';
            rightEye.style.transform = 'translateZ(2px)';
            rightEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(rightEye);

            // Add pupils
            const leftPupil = document.createElement('div');
            leftPupil.style.position = 'absolute';
            leftPupil.style.width = '45%';
            leftPupil.style.height = '45%';
            leftPupil.style.backgroundColor = 'black';
            leftPupil.style.borderRadius = '50%';
            leftPupil.style.top = '30%';
            leftPupil.style.left = '30%';
            leftPupil.style.transform = 'translateZ(1px)';
            leftEye.appendChild(leftPupil);

            const rightPupil = document.createElement('div');
            rightPupil.style.position = 'absolute';
            rightPupil.style.width = '45%';
            rightPupil.style.height = '45%';
            rightPupil.style.backgroundColor = 'black';
            rightPupil.style.borderRadius = '50%';
            rightPupil.style.top = '30%';
            rightPupil.style.left = '30%';
            rightPupil.style.transform = 'translateZ(1px)';
            rightEye.appendChild(rightPupil);

            // Add distinctive rabbit nose - Y-shaped
            const nose = document.createElement('div');
            nose.style.position = 'absolute';
            nose.style.width = '20%';
            nose.style.height = '15%';
            nose.style.backgroundColor = '#FFB6C1';
            nose.style.borderRadius = '50% 50% 0 0';
            nose.style.bottom = '25%';
            nose.style.left = '40%';
            nose.style.transform = 'translateZ(3px)';
            head.appendChild(nose);

            // Add mouth line
            const mouth = document.createElement('div');
            mouth.style.position = 'absolute';
            mouth.style.width = '2px';
            mouth.style.height = '15%';
            mouth.style.backgroundColor = '#8B4513';
            mouth.style.bottom = '15%';
            mouth.style.left = '49%';
            mouth.style.transform = 'translateZ(3px)';
            head.appendChild(mouth);

            // Add distinctive cotton tail
            const tail = document.createElement('div');
            tail.style.position = 'absolute';
            tail.style.width = '20%';
            tail.style.height = '20%';
            tail.style.backgroundColor = '#F5F5DC'; // Light beige
            tail.style.borderRadius = '50%';
            tail.style.bottom = '5%';
            tail.style.left = '-8%';
            tail.style.transform = 'translateZ(-2px)';
            tail.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            body.appendChild(tail);

            // Add fluffy tail texture
            const tailFluff = document.createElement('div');
            tailFluff.style.position = 'absolute';
            tailFluff.style.width = '80%';
            tailFluff.style.height = '80%';
            tailFluff.style.backgroundColor = 'white';
            tailFluff.style.borderRadius = '50%';
            tailFluff.style.top = '10%';
            tailFluff.style.left = '10%';
            tail.appendChild(tailFluff);

            // Add legs - rabbit-specific positioning
            const legPositions = [
                { bottom: '0%', left: '20%', rotation: -5 },
                { bottom: '0%', right: '20%', rotation: 5 },
            ];

            legPositions.forEach((pos, index) => {
                const leg = document.createElement('div');
                leg.style.position = 'absolute';
                leg.style.width = '18%';
                leg.style.height = '30%'; // Longer legs for hopping
                leg.style.backgroundColor = '#D2B48C';
                leg.style.borderRadius = '40% 40% 20% 20%';
                leg.style.bottom = pos.bottom;

                if (pos.left) leg.style.left = pos.left;
                if (pos.right) leg.style.right = pos.right;

                leg.style.transform = `translateZ(-2px) rotate(${pos.rotation}deg)`;
                leg.style.transformOrigin = 'top center';
                leg.style.boxShadow = '0 2px 3px rgba(0,0,0,0.2)';
                body.appendChild(leg);

                // Add large rabbit foot
                const foot = document.createElement('div');
                foot.style.position = 'absolute';
                foot.style.width = '140%'; // Larger feet
                foot.style.height = '25%';
                foot.style.backgroundColor = '#8B4513';
                foot.style.borderRadius = '60% 60% 20% 20%';
                foot.style.bottom = '-20%';
                foot.style.left = '-20%';
                leg.appendChild(foot);
            });

            // Add hopping animation specific to rabbits
            const keyframes = `
                @keyframes rabbitHop${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scaleY(1); }
                    25% { transform: translateZ(${organism.heightOffset}px) translateY(-8px) scaleY(0.9); }
                    50% { transform: translateZ(${organism.heightOffset}px) translateY(-12px) scaleY(0.85); }
                    75% { transform: translateZ(${organism.heightOffset}px) translateY(-8px) scaleY(0.9); }
                    100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scaleY(1); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `rabbitHop${organism.id} 1.2s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },
    CARD_COMMON_RACCOON: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create raccoon body - stocky and rounded
            body.style.backgroundColor = '#696969'; // Dark gray
            body.style.borderRadius = '55% 55% 45% 45% / 65% 65% 40% 40%';
            body.style.boxShadow = '0 6px 12px rgba(0,0,0,0.4)';

            // Add lighter chest/belly
            const chest = document.createElement('div');
            chest.style.position = 'absolute';
            chest.style.width = '60%';
            chest.style.height = '55%';
            chest.style.backgroundColor = '#A9A9A9'; // Light gray
            chest.style.borderRadius = '50%';
            chest.style.bottom = '20%';
            chest.style.left = '20%';
            chest.style.zIndex = '2';
            body.appendChild(chest);

            // Add head
            const head = document.createElement('div');
            head.style.position = 'absolute';
            head.style.width = '60%';
            head.style.height = '55%';
            head.style.backgroundColor = '#696969';
            head.style.borderRadius = '65% 65% 45% 45%';
            head.style.top = '-25%';
            head.style.left = '20%';
            head.style.zIndex = '3';
            head.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.2)';
            head.style.transform = 'translateZ(5px)';
            body.appendChild(head);

            // Add distinctive raccoon mask around eyes
            const mask = document.createElement('div');
            mask.style.position = 'absolute';
            mask.style.width = '80%';
            mask.style.height = '40%';
            mask.style.backgroundColor = '#2F2F2F'; // Very dark gray/black
            mask.style.borderRadius = '50%';
            mask.style.top = '25%';
            mask.style.left = '10%';
            mask.style.transform = 'translateZ(2px)';
            head.appendChild(mask);

            // Add white markings above and below mask
            const upperMark = document.createElement('div');
            upperMark.style.position = 'absolute';
            upperMark.style.width = '70%';
            upperMark.style.height = '20%';
            upperMark.style.backgroundColor = '#F5F5F5'; // Off-white
            upperMark.style.borderRadius = '50%';
            upperMark.style.top = '15%';
            upperMark.style.left = '15%';
            upperMark.style.transform = 'translateZ(1px)';
            head.appendChild(upperMark);

            const lowerMark = document.createElement('div');
            lowerMark.style.position = 'absolute';
            lowerMark.style.width = '50%';
            lowerMark.style.height = '25%';
            lowerMark.style.backgroundColor = '#F5F5F5';
            lowerMark.style.borderRadius = '50%';
            lowerMark.style.bottom = '15%';
            lowerMark.style.left = '25%';
            lowerMark.style.transform = 'translateZ(1px)';
            head.appendChild(lowerMark);

            // Add small rounded ears
            const leftEar = document.createElement('div');
            leftEar.style.position = 'absolute';
            leftEar.style.width = '20%';
            leftEar.style.height = '25%';
            leftEar.style.backgroundColor = '#696969';
            leftEar.style.borderRadius = '50%';
            leftEar.style.top = '-10%';
            leftEar.style.left = '20%';
            leftEar.style.transform = 'translateZ(-1px)';
            leftEar.style.boxShadow = '-1px -1px 2px rgba(0,0,0,0.2)';
            head.appendChild(leftEar);

            const rightEar = document.createElement('div');
            rightEar.style.position = 'absolute';
            rightEar.style.width = '20%';
            rightEar.style.height = '25%';
            rightEar.style.backgroundColor = '#696969';
            rightEar.style.borderRadius = '50%';
            rightEar.style.top = '-10%';
            rightEar.style.right = '20%';
            rightEar.style.transform = 'translateZ(-1px)';
            rightEar.style.boxShadow = '1px -1px 2px rgba(0,0,0,0.2)';
            head.appendChild(rightEar);

            // Add bright eyes that show through the mask
            const leftEye = document.createElement('div');
            leftEye.style.position = 'absolute';
            leftEye.style.width = '18%';
            leftEye.style.height = '18%';
            leftEye.style.backgroundColor = '#FFD700'; // Golden yellow for night vision
            leftEye.style.borderRadius = '50%';
            leftEye.style.top = '30%';
            leftEye.style.left = '25%';
            leftEye.style.transform = 'translateZ(3px)';
            leftEye.style.boxShadow = '0 0 4px rgba(255, 215, 0, 0.6)';
            head.appendChild(leftEye);

            const rightEye = document.createElement('div');
            rightEye.style.position = 'absolute';
            rightEye.style.width = '18%';
            rightEye.style.height = '18%';
            rightEye.style.backgroundColor = '#FFD700';
            rightEye.style.borderRadius = '50%';
            rightEye.style.top = '30%';
            rightEye.style.right = '25%';
            rightEye.style.transform = 'translateZ(3px)';
            rightEye.style.boxShadow = '0 0 4px rgba(255, 215, 0, 0.6)';
            head.appendChild(rightEye);

            // Add pupils
            const leftPupil = document.createElement('div');
            leftPupil.style.position = 'absolute';
            leftPupil.style.width = '40%';
            leftPupil.style.height = '40%';
            leftPupil.style.backgroundColor = 'black';
            leftPupil.style.borderRadius = '50%';
            leftPupil.style.top = '30%';
            leftPupil.style.left = '30%';
            leftPupil.style.transform = 'translateZ(1px)';
            leftEye.appendChild(leftPupil);

            const rightPupil = document.createElement('div');
            rightPupil.style.position = 'absolute';
            rightPupil.style.width = '40%';
            rightPupil.style.height = '40%';
            rightPupil.style.backgroundColor = 'black';
            rightPupil.style.borderRadius = '50%';
            rightPupil.style.top = '30%';
            rightPupil.style.left = '30%';
            rightPupil.style.transform = 'translateZ(1px)';
            rightEye.appendChild(rightPupil);

            // Add distinctive black nose
            const nose = document.createElement('div');
            nose.style.position = 'absolute';
            nose.style.width = '15%';
            nose.style.height = '12%';
            nose.style.backgroundColor = '#1C1C1C'; // Very dark
            nose.style.borderRadius = '50%';
            nose.style.bottom = '25%';
            nose.style.left = '42.5%';
            nose.style.transform = 'translateZ(3px)';
            head.appendChild(nose);

            // Add distinctive ringed tail
            const tail = document.createElement('div');
            tail.style.position = 'absolute';
            tail.style.width = '12%';
            tail.style.height = '45%';
            tail.style.backgroundColor = '#696969';
            tail.style.borderRadius = '40% 40% 20% 20%';
            tail.style.bottom = '15%';
            tail.style.left = '-8%';
            tail.style.transform = 'translateZ(-3px) rotate(-20deg)';
            tail.style.transformOrigin = 'bottom right';
            body.appendChild(tail);

            // Add tail rings
            const ringPositions = [20, 40, 60, 80];
            ringPositions.forEach(pos => {
                const ring = document.createElement('div');
                ring.style.position = 'absolute';
                ring.style.width = '100%';
                ring.style.height = '8%';
                ring.style.backgroundColor = '#2F2F2F'; // Dark ring
                ring.style.top = `${pos}%`;
                ring.style.left = '0';
                tail.appendChild(ring);
            });

            // Add dexterous front paws
            const leftPaw = document.createElement('div');
            leftPaw.style.position = 'absolute';
            leftPaw.style.width = '15%';
            leftPaw.style.height = '20%';
            leftPaw.style.backgroundColor = '#2F2F2F'; // Dark paws
            leftPaw.style.borderRadius = '50% 50% 30% 30%';
            leftPaw.style.bottom = '25%';
            leftPaw.style.left = '5%';
            leftPaw.style.transform = 'translateZ(-1px)';
            body.appendChild(leftPaw);

            const rightPaw = document.createElement('div');
            rightPaw.style.position = 'absolute';
            rightPaw.style.width = '15%';
            rightPaw.style.height = '20%';
            rightPaw.style.backgroundColor = '#2F2F2F';
            rightPaw.style.borderRadius = '50% 50% 30% 30%';
            rightPaw.style.bottom = '25%';
            rightPaw.style.right = '5%';
            rightPaw.style.transform = 'translateZ(-1px)';
            body.appendChild(rightPaw);

            // Add back legs
            const leftLeg = document.createElement('div');
            leftLeg.style.position = 'absolute';
            leftLeg.style.width = '18%';
            leftLeg.style.height = '25%';
            leftLeg.style.backgroundColor = '#696969';
            leftLeg.style.borderRadius = '40% 40% 20% 20%';
            leftLeg.style.bottom = '0%';
            leftLeg.style.left = '15%';
            leftLeg.style.transform = 'translateZ(-2px)';
            body.appendChild(leftLeg);

            const rightLeg = document.createElement('div');
            rightLeg.style.position = 'absolute';
            rightLeg.style.width = '18%';
            rightLeg.style.height = '25%';
            rightLeg.style.backgroundColor = '#696969';
            rightLeg.style.borderRadius = '40% 40% 20% 20%';
            rightLeg.style.bottom = '0%';
            rightLeg.style.right = '15%';
            rightLeg.style.transform = 'translateZ(-2px)';
            body.appendChild(rightLeg);

            // Add feet
            [leftLeg, rightLeg].forEach(leg => {
                const foot = document.createElement('div');
                foot.style.position = 'absolute';
                foot.style.width = '120%';
                foot.style.height = '20%';
                foot.style.backgroundColor = '#2F2F2F';
                foot.style.borderRadius = '50% 50% 20% 20%';
                foot.style.bottom = '-15%';
                foot.style.left = '-10%';
                leg.appendChild(foot);
            });

            // Add subtle nocturnal animation - slower, more deliberate movement
            const keyframes = `
                @keyframes raccoonProwl${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg); }
                    25% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) rotate(-0.5deg); }
                    50% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(0deg); }
                    75% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) rotate(0.5deg); }
                    100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `raccoonProwl${organism.id} 2.5s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },

    carnivore: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create a sleek predator body
            body.style.backgroundColor = '#B22222';
            body.style.borderRadius = '60% 60% 30% 30% / 60% 60% 40% 40%';
            body.style.boxShadow = '0 8px 15px rgba(0,0,0,0.4)';

            // Add body markings
            const marking = document.createElement('div');
            marking.style.position = 'absolute';
            marking.style.width = '70%';
            marking.style.height = '40%';
            marking.style.backgroundColor = '#8B0000';
            marking.style.borderRadius = '40% 40% 60% 60%';
            marking.style.bottom = '10%';
            marking.style.left = '15%';
            marking.style.transform = 'translateZ(1px)';
            body.appendChild(marking);

            // Add head
            const head = document.createElement('div');
            head.style.position = 'absolute';
            head.style.width = '70%';
            head.style.height = '60%';
            head.style.backgroundColor = '#B22222';
            head.style.borderRadius = '60% 60% 30% 30% / 50% 50% 30% 30%';
            head.style.top = '-25%';
            head.style.left = '15%';
            head.style.zIndex = '3';
            head.style.transform = 'translateZ(10px)';
            head.style.boxShadow = '0 -4px 8px rgba(0,0,0,0.3)';
            body.appendChild(head);

            // Add eyes
            const leftEye = document.createElement('div');
            leftEye.style.position = 'absolute';
            leftEye.style.width = '20%';
            leftEye.style.height = '20%';
            leftEye.style.backgroundColor = 'white';
            leftEye.style.borderRadius = '50%';
            leftEye.style.top = '25%';
            leftEye.style.left = '15%';
            leftEye.style.transform = 'translateZ(2px)';
            leftEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(leftEye);

            const rightEye = document.createElement('div');
            rightEye.style.position = 'absolute';
            rightEye.style.width = '20%';
            rightEye.style.height = '20%';
            rightEye.style.backgroundColor = 'white';
            rightEye.style.borderRadius = '50%';
            rightEye.style.top = '25%';
            rightEye.style.right = '15%';
            rightEye.style.transform = 'translateZ(2px)';
            rightEye.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3) inset';
            head.appendChild(rightEye);

            // Add slitted pupils for predator look
            const leftPupil = document.createElement('div');
            leftPupil.style.position = 'absolute';
            leftPupil.style.width = '30%';
            leftPupil.style.height = '80%';
            leftPupil.style.backgroundColor = 'black';
            leftPupil.style.borderRadius = '40%';
            leftPupil.style.top = '10%';
            leftPupil.style.left = '35%';
            leftPupil.style.transform = 'translateZ(1px)';
            leftEye.appendChild(leftPupil);

            const rightPupil = document.createElement('div');
            rightPupil.style.position = 'absolute';
            rightPupil.style.width = '30%';
            rightPupil.style.height = '80%';
            rightPupil.style.backgroundColor = 'black';
            rightPupil.style.borderRadius = '40%';
            rightPupil.style.top = '10%';
            rightPupil.style.left = '35%';
            rightPupil.style.transform = 'translateZ(1px)';
            rightEye.appendChild(rightPupil);

            // Add ears
            const leftEar = document.createElement('div');
            leftEar.style.position = 'absolute';
            leftEar.style.width = '25%';
            leftEar.style.height = '35%';
            leftEar.style.backgroundColor = '#B22222';
            leftEar.style.borderRadius = '50% 50% 20% 20%';
            leftEar.style.top = '-20%';
            leftEar.style.left = '10%';
            leftEar.style.transform = 'translateZ(-1px) rotate(-15deg)';
            leftEar.style.transformOrigin = 'bottom center';
            leftEar.style.boxShadow = '-1px -1px 3px rgba(0,0,0,0.2)';
            head.appendChild(leftEar);

            const rightEar = document.createElement('div');
            rightEar.style.position = 'absolute';
            rightEar.style.width = '25%';
            rightEar.style.height = '35%';
            rightEar.style.backgroundColor = '#B22222';
            rightEar.style.borderRadius = '50% 50% 20% 20%';
            rightEar.style.top = '-20%';
            rightEar.style.right = '10%';
            rightEar.style.transform = 'translateZ(-1px) rotate(15deg)';
            rightEar.style.transformOrigin = 'bottom center';
            rightEar.style.boxShadow = '1px -1px 3px rgba(0,0,0,0.2)';
            head.appendChild(rightEar);

            // Add muzzle with teeth
            const muzzle = document.createElement('div');
            muzzle.style.position = 'absolute';
            muzzle.style.width = '40%';
            muzzle.style.height = '35%';
            muzzle.style.backgroundColor = '#8B0000';
            muzzle.style.borderRadius = '40% 40% 60% 60%';
            muzzle.style.bottom = '5%';
            muzzle.style.left = '30%';
            muzzle.style.transform = 'translateZ(5px)';
            head.appendChild(muzzle);

            // Add teeth
            const teeth = document.createElement('div');
            teeth.style.position = 'absolute';
            teeth.style.width = '80%';
            teeth.style.height = '20%';
            teeth.style.bottom = '0%';
            teeth.style.left = '10%';
            teeth.style.backgroundColor = 'white';
            teeth.style.borderRadius = '0 0 5px 5px';
            teeth.style.transform = 'translateZ(1px)';
            teeth.style.boxShadow = 'inset 0 -5px 5px rgba(0,0,0,0.2)';
            teeth.style.clipPath = 'polygon(0% 0%, 15% 100%, 30% 0%, 45% 100%, 60% 0%, 75% 100%, 90% 0%, 100% 100%, 100% 0%)';
            muzzle.appendChild(teeth);

            // Add limbs - powerful legs
            const limbs = [
                { bottom: '0%', left: '10%', rotation: -8 },
                { bottom: '0%', right: '10%', rotation: 8 }
            ];

            limbs.forEach(limb => {
                const leg = document.createElement('div');
                leg.style.position = 'absolute';
                leg.style.width = '20%';
                leg.style.height = '30%';
                leg.style.backgroundColor = '#B22222';
                leg.style.borderRadius = '40% 40% 20% 20%';
                leg.style.bottom = limb.bottom;

                if (limb.left) leg.style.left = limb.left;
                if (limb.right) leg.style.right = limb.right;

                leg.style.transform = `translateZ(-3px) rotate(${limb.rotation}deg)`;
                leg.style.transformOrigin = 'top center';
                leg.style.boxShadow = '0 3px 5px rgba(0,0,0,0.3)';
                body.appendChild(leg);

                // Add foot with claws
                const foot = document.createElement('div');
                foot.style.position = 'absolute';
                foot.style.width = '130%';
                foot.style.height = '25%';
                foot.style.backgroundColor = '#8B0000';
                foot.style.borderRadius = '40% 40% 20% 20%';
                foot.style.bottom = '-20%';
                foot.style.left = '-15%';
                leg.appendChild(foot);

                // Add claws
                const claws = document.createElement('div');
                claws.style.position = 'absolute';
                claws.style.width = '100%';
                claws.style.height = '30%';
                claws.style.bottom = '-15%';
                claws.style.left = '5%';
                claws.style.display = 'flex';
                claws.style.justifyContent = 'space-around';
                foot.appendChild(claws);

                for (let i = 0; i < 3; i++) {
                    const claw = document.createElement('div');
                    claw.style.width = '15%';
                    claw.style.height = '100%';
                    claw.style.backgroundColor = 'white';
                    claw.style.borderRadius = '50% 50% 40% 40%';
                    claws.appendChild(claw);
                }
            });

            // Add tail
            const tail = document.createElement('div');
            tail.style.position = 'absolute';
            tail.style.width = '15%';
            tail.style.height = '40%';
            tail.style.backgroundColor = '#B22222';
            tail.style.borderRadius = '40% 40% 20% 20%';
            tail.style.bottom = '20%';
            tail.style.left = '-10%';
            tail.style.transform = 'translateZ(-5px) rotate(-20deg)';
            tail.style.transformOrigin = 'top right';
            body.appendChild(tail);

            // Add animation - prowling motion
            const keyframes = `
                @keyframes carnivoreProwl${organism.id} {
                    0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg); }
                    25% { transform: translateZ(${organism.heightOffset}px) rotate(-1deg) translateX(-2px); }
                    50% { transform: translateZ(${organism.heightOffset}px) rotate(0deg); }
                    75% { transform: translateZ(${organism.heightOffset}px) rotate(1deg) translateX(2px); }
                    100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg); }
                }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `carnivoreProwl${organism.id} 2s infinite ease-in-out`;

            container.appendChild(body);

            return body;
        }
    },

    CARD_CORNMAIZE: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';
            // Override CSS flex properties that interfere with absolute positioning
            body.style.display = 'block';
            body.style.alignItems = 'initial';
            body.style.justifyContent = 'initial';

            // Create main corn stalk - tall and sturdy, scaled to organism size
            const stalkWidth = Math.max(4, organism.size * 0.15); // Scale stalk width with size, minimum 4px
            const stalk = document.createElement('div');
            stalk.style.position = 'absolute';
            stalk.style.width = `${stalkWidth}px`;
            stalk.style.height = `${organism.size * 1.2}px`; // Taller than other plants
            stalk.style.backgroundColor = '#228B22'; // Forest green
            stalk.style.bottom = '0';
            stalk.style.left = '50%';
            stalk.style.transform = 'translateX(-50%)';
            stalk.style.borderRadius = '4px 4px 0 0';
            stalk.style.boxShadow = '2px 2px 4px rgba(0,0,0,0.3)';
            stalk.style.background = 'linear-gradient(to right, #228B22, #32CD32, #228B22)';
            stalk.style.zIndex = '2'; // Stalk in middle layer
            body.appendChild(stalk);

            // Add corn ears (2-3 ears at different heights)
            const earCount = 2 + Math.floor(Math.random() * 2); // 2-3 ears
            for (let i = 0; i < earCount; i++) {
                const ear = document.createElement('div');
                ear.style.position = 'absolute';
                ear.style.width = `${organism.size * 0.4}px`;
                ear.style.height = `${organism.size * 0.6}px`;
                ear.style.backgroundColor = '#FFD700'; // Golden yellow
                ear.style.borderRadius = '8px 8px 4px 4px';
                ear.style.border = '2px solid #DAA520';
                ear.style.zIndex = '3'; // Ensure ears appear above leaves

                // Position ears at different heights and sides, scaled to stalk size
                const side = i % 2 === 0 ? 'left' : 'right';
                const heightOffset = 30 + (i * 20); // Stagger heights

                // Scale ear positions relative to stalk width
                const leftEarOffset = -(stalkWidth * 2.5); // Position left ear relative to stalk width
                const rightEarOffset = stalkWidth * 0.5; // Position right ear relative to stalk width

                if (side === 'left') {
                    ear.style.left = `${leftEarOffset}px`;
                    ear.style.transform = 'rotate(-15deg)';
                } else {
                    ear.style.left = `${rightEarOffset}px`;
                    ear.style.transform = 'rotate(15deg)';
                }
                ear.style.bottom = `${heightOffset}%`;
                ear.style.boxShadow = '0 3px 6px rgba(0,0,0,0.3)';

                // Add corn kernel texture
                const kernelPattern = document.createElement('div');
                kernelPattern.style.position = 'absolute';
                kernelPattern.style.width = '100%';
                kernelPattern.style.height = '100%';
                kernelPattern.style.background = `
                    radial-gradient(circle at 25% 25%, #FFF8DC 2px, transparent 2px),
                    radial-gradient(circle at 75% 25%, #FFF8DC 2px, transparent 2px),
                    radial-gradient(circle at 25% 75%, #FFF8DC 2px, transparent 2px),
                    radial-gradient(circle at 75% 75%, #FFF8DC 2px, transparent 2px)
                `;
                kernelPattern.style.backgroundSize = '8px 8px';
                kernelPattern.style.borderRadius = '8px 8px 4px 4px';
                ear.appendChild(kernelPattern);

                // Add corn silk (thin strands)
                if (Math.random() > 0.5) {
                    const silk = document.createElement('div');
                    silk.style.position = 'absolute';
                    silk.style.width = '2px';
                    silk.style.height = '15px';
                    silk.style.backgroundColor = '#DEB887';
                    silk.style.top = '-10px';
                    silk.style.left = '50%';
                    silk.style.transform = 'translateX(-50%) rotate(' + (Math.random() * 30 - 15) + 'deg)';
                    silk.style.borderRadius = '1px';
                    silk.style.zIndex = '1'
                    ear.appendChild(silk);
                }

                stalk.appendChild(ear);
            }

            // Add corn leaves (long and blade-like)
            const leafCount = 2 + Math.floor(Math.random() * 3); // 2-4 leaves
            for (let i = 0; i < leafCount; i++) {
                const leaf = document.createElement('div');
                leaf.style.position = 'absolute';
                leaf.style.width = '6px';
                leaf.style.height = `${organism.size * 0.8}px`;
                leaf.style.backgroundColor = '#228B22';
                leaf.style.borderRadius = '3px 3px 0 0';
                leaf.style.transformOrigin = 'bottom center';
                leaf.style.zIndex = '1'; // Ensure leaves appear behind ears

                // Alternate sides and create natural spread
                const side = i % 2 === 0 ? -1 : 1;
                const angle = (20 + Math.random() * 20) * side; // 20-40 degrees
                const heightOffset = 10 + (i * 8); // Stagger leaf heights

                leaf.style.bottom = `${heightOffset}%`;
                leaf.style.left = '50%';
                leaf.style.transform = `translateX(-50%) rotate(${angle}deg)`;
                leaf.style.background = 'linear-gradient(to top, #228B22, #32CD32)';
                leaf.style.boxShadow = '1px 1px 3px rgba(0,0,0,0.2)';

                // Add leaf vein
                const vein = document.createElement('div');
                vein.style.position = 'absolute';
                vein.style.width = '1px';
                vein.style.height = '100%';
                vein.style.backgroundColor = '#006400';
                vein.style.left = '50%';
                vein.style.transform = 'translateX(-50%)';
                leaf.appendChild(vein);

                stalk.appendChild(leaf);
            }

            // Add tassel at the top (corn flower) - scaled to organism size
            const tasselWidth = Math.max(6, organism.size * 0.25); // Scale tassel width
            const tasselHeight = Math.max(10, organism.size * 0.4); // Scale tassel height
            const tassel = document.createElement('div');
            tassel.style.position = 'absolute';
            tassel.style.width = `${tasselWidth}px`;
            tassel.style.height = `${tasselHeight}px`;
            tassel.style.backgroundColor = '#DEB887';
            tassel.style.top = `-${tasselHeight * 0.75}px`; // Position relative to tassel height
            tassel.style.left = '50%';
            tassel.style.transform = 'translateX(-50%)';
            tassel.style.borderRadius = '6px 6px 0 0';
            tassel.style.background = 'linear-gradient(to top, #DEB887, #F5DEB3)';
            tassel.style.zIndex = '2'; // Behind ears but above leaves

            // Add tassel strands
            for (let i = 0; i < 5; i++) {
                const strand = document.createElement('div');
                strand.style.position = 'absolute';
                strand.style.width = '1px';
                strand.style.height = '8px';
                strand.style.backgroundColor = '#DEB887';
                strand.style.top = '-5px';
                strand.style.left = `${20 + i * 15}%`;
                strand.style.transform = 'rotate(' + (Math.random() * 20 - 10) + 'deg)';
                tassel.appendChild(strand);
            }

            stalk.appendChild(tassel);

            container.appendChild(body);
            return body;
        }
    },
    CARD_BORNEAN_ORANGUTAN: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create orangutan body - robust and ape-like
            body.style.backgroundColor = '#CD853F'; // Peru/orange-brown
            body.style.borderRadius = '55% 55% 45% 45% / 70% 70% 30% 30%';
            body.style.boxShadow = '0 8px 15px rgba(0,0,0,0.4)';

            // Add chest marking
            const chest = document.createElement('div');
            chest.style.position = 'absolute';
            chest.style.width = '50%';
            chest.style.height = '40%';
            chest.style.backgroundColor = '#DEB887'; // Lighter brown
            chest.style.borderRadius = '50%';
            chest.style.bottom = '20%';
            chest.style.left = '25%';
            chest.style.zIndex = '2';
            body.appendChild(chest);

            // Add orangutan head - larger and more rounded
            const head = document.createElement('div');
            head.style.position = 'absolute';
            head.style.width = '70%';
            head.style.height = '60%';
            head.style.backgroundColor = '#CD853F';
            head.style.borderRadius = '60%';
            head.style.top = '-25%';
            head.style.left = '15%';
            head.style.zIndex = '3';
            head.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.2)';
            head.style.transform = 'translateZ(5px)';
            body.appendChild(head);

            // Add distinctive orangutan face disc
            const faceDisc = document.createElement('div');
            faceDisc.style.position = 'absolute';
            faceDisc.style.width = '80%';
            faceDisc.style.height = '70%';
            faceDisc.style.backgroundColor = '#DEB887';
            faceDisc.style.borderRadius = '50%';
            faceDisc.style.top = '15%';
            faceDisc.style.left = '10%';
            faceDisc.style.zIndex = '1';
            head.appendChild(faceDisc);

            // Add orangutan eyes - intelligent looking
            const leftEye = document.createElement('div');
            leftEye.style.position = 'absolute';
            leftEye.style.width = '25%';
            leftEye.style.height = '25%';
            leftEye.style.backgroundColor = 'white';
            leftEye.style.borderRadius = '50%';
            leftEye.style.top = '35%';
            leftEye.style.left = '20%';
            leftEye.style.zIndex = '4';
            head.appendChild(leftEye);

            const rightEye = document.createElement('div');
            rightEye.style.position = 'absolute';
            rightEye.style.width = '25%';
            rightEye.style.height = '25%';
            rightEye.style.backgroundColor = 'white';
            rightEye.style.borderRadius = '50%';
            rightEye.style.top = '35%';
            rightEye.style.right = '20%';
            rightEye.style.zIndex = '4';
            head.appendChild(rightEye);

            // Add pupils
            const leftPupil = document.createElement('div');
            leftPupil.style.position = 'absolute';
            leftPupil.style.width = '60%';
            leftPupil.style.height = '60%';
            leftPupil.style.backgroundColor = '#8B4513';
            leftPupil.style.borderRadius = '50%';
            leftPupil.style.top = '20%';
            leftPupil.style.left = '20%';
            leftEye.appendChild(leftPupil);

            const rightPupil = document.createElement('div');
            rightPupil.style.position = 'absolute';
            rightPupil.style.width = '60%';
            rightPupil.style.height = '60%';
            rightPupil.style.backgroundColor = '#8B4513';
            rightPupil.style.borderRadius = '50%';
            rightPupil.style.top = '20%';
            rightPupil.style.left = '20%';
            rightEye.appendChild(rightPupil);

            // Add long orangutan arms
            const leftArm = document.createElement('div');
            leftArm.style.position = 'absolute';
            leftArm.style.width = '15%';
            leftArm.style.height = '80%';
            leftArm.style.backgroundColor = '#CD853F';
            leftArm.style.borderRadius = '50%';
            leftArm.style.top = '10%';
            leftArm.style.left = '-10%';
            leftArm.style.zIndex = '1';
            leftArm.style.transform = 'rotate(-20deg)';
            leftArm.style.transformOrigin = 'top center';
            body.appendChild(leftArm);

            const rightArm = document.createElement('div');
            rightArm.style.position = 'absolute';
            rightArm.style.width = '15%';
            rightArm.style.height = '80%';
            rightArm.style.backgroundColor = '#CD853F';
            rightArm.style.borderRadius = '50%';
            rightArm.style.top = '10%';
            rightArm.style.right = '-10%';
            rightArm.style.zIndex = '1';
            rightArm.style.transform = 'rotate(20deg)';
            rightArm.style.transformOrigin = 'top center';
            body.appendChild(rightArm);

            // Add animation - swinging motion
            const keyframes = `
            @keyframes orangutanSwing${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-4px) rotate(1deg); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `orangutanSwing${organism.id} 3s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_DOMESTIC_CAT: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use cat emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Cat emoji
            body.textContent = '🐈';

            // Add subtle animation
            const keyframes = `
            @keyframes catMove${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) rotate(-1deg) scale(1.02); }
                75% { transform: translateZ(${organism.heightOffset}px) rotate(1deg) scale(0.98); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `catMove${organism.id} 2s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_AFRICAN_LION: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use lion emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Lion emoji
            body.textContent = '🦁';

            // Add regal animation
            const keyframes = `
            @keyframes lionMove${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                50% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1.05); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `lionMove${organism.id} 3s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_TIGER: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use tiger emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Tiger emoji
            body.textContent = '🐅';

            // Add prowling animation
            const keyframes = `
            @keyframes tigerProwl${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateX(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateX(-1px) scale(1.02); }
                75% { transform: translateZ(${organism.heightOffset}px) translateX(1px) scale(0.98); }
                100% { transform: translateZ(${organism.heightOffset}px) translateX(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `tigerProwl${organism.id} 2.5s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_AFRICAN_BUSH_ELEPHANT: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use elephant emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Elephant emoji
            body.textContent = '🐘';

            container.appendChild(body);
        }
    },

    CARD_WOOLLY_MAMMOTH: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use mammoth emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Mammoth emoji (using elephant with different styling for extinct species)
            body.textContent = '🦣';

            // Add gentle swaying animation
            const keyframes = `
            @keyframes elephantSway${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                33% { transform: translateZ(${organism.heightOffset}px) rotate(-0.5deg) scale(1.01); }
                66% { transform: translateZ(${organism.heightOffset}px) rotate(0.5deg) scale(0.99); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `elephantSway${organism.id} 4s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_COMMON_FROG: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use frog emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Frog emoji
            body.textContent = '🐸';

            // Add hopping animation
            const keyframes = `
            @keyframes frogHop${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-6px) scale(0.9); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-8px) scale(0.85); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-4px) scale(0.95); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `frogHop${organism.id} 1.8s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    'evergreen-tree': {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Create evergreen tree body - tall and conical
            body.style.backgroundColor = '#8B4513'; // Brown trunk
            body.style.borderRadius = '20% 20% 50% 50% / 10% 10% 90% 90%';
            body.style.boxShadow = '0 8px 15px rgba(0,0,0,0.3)';
            body.style.position = 'relative';

            // Create trunk
            const trunk = document.createElement('div');
            trunk.style.position = 'absolute';
            trunk.style.width = '20%';
            trunk.style.height = '30%';
            trunk.style.backgroundColor = '#8B4513';
            trunk.style.bottom = '0';
            trunk.style.left = '40%';
            trunk.style.zIndex = '1';
            trunk.style.boxShadow = '2px 0 4px rgba(0,0,0,0.2)';
            body.appendChild(trunk);

            // Create layered evergreen foliage - bottom layer
            const bottomLayer = document.createElement('div');
            bottomLayer.style.position = 'absolute';
            bottomLayer.style.width = '90%';
            bottomLayer.style.height = '35%';
            bottomLayer.style.backgroundColor = '#228B22'; // Forest green
            bottomLayer.style.borderRadius = '0 0 50% 50% / 0 0 100% 100%';
            bottomLayer.style.bottom = '25%';
            bottomLayer.style.left = '5%';
            bottomLayer.style.zIndex = '2';
            bottomLayer.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            bottomLayer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            body.appendChild(bottomLayer);

            // Create middle layer
            const middleLayer = document.createElement('div');
            middleLayer.style.position = 'absolute';
            middleLayer.style.width = '75%';
            middleLayer.style.height = '35%';
            middleLayer.style.backgroundColor = '#32CD32'; // Lime green
            middleLayer.style.borderRadius = '0 0 50% 50% / 0 0 100% 100%';
            middleLayer.style.bottom = '45%';
            middleLayer.style.left = '12.5%';
            middleLayer.style.zIndex = '3';
            middleLayer.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            middleLayer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            body.appendChild(middleLayer);

            // Create top layer
            const topLayer = document.createElement('div');
            topLayer.style.position = 'absolute';
            topLayer.style.width = '60%';
            topLayer.style.height = '35%';
            topLayer.style.backgroundColor = '#228B22'; // Forest green
            topLayer.style.borderRadius = '0 0 50% 50% / 0 0 100% 100%';
            topLayer.style.bottom = '65%';
            topLayer.style.left = '20%';
            topLayer.style.zIndex = '4';
            topLayer.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            topLayer.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            body.appendChild(topLayer);

            // Create tree top point
            const treeTop = document.createElement('div');
            treeTop.style.position = 'absolute';
            treeTop.style.width = '45%';
            treeTop.style.height = '25%';
            treeTop.style.backgroundColor = '#006400'; // Dark green
            treeTop.style.borderRadius = '50% 50% 0 0 / 100% 100% 0 0';
            treeTop.style.top = '0%';
            treeTop.style.left = '27.5%';
            treeTop.style.zIndex = '5';
            treeTop.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            treeTop.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            body.appendChild(treeTop);

            // Add some texture with small branches
            for (let i = 0; i < 3; i++) {
                const branch = document.createElement('div');
                branch.style.position = 'absolute';
                branch.style.width = '3px';
                branch.style.height = '15px';
                branch.style.backgroundColor = '#8B4513';
                branch.style.bottom = `${30 + i * 15}%`;
                branch.style.left = i % 2 === 0 ? '10%' : '85%';
                branch.style.transform = i % 2 === 0 ? 'rotate(-30deg)' : 'rotate(30deg)';
                branch.style.transformOrigin = 'bottom center';
                branch.style.zIndex = '6';
                body.appendChild(branch);
            }

            // Add gentle swaying animation
            const keyframes = `
            @keyframes evergreenSway${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg); }
                25% { transform: translateZ(${organism.heightOffset}px) rotate(-1deg); }
                75% { transform: translateZ(${organism.heightOffset}px) rotate(1deg); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `evergreenSway${organism.id} 4s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_DOMESTIC_HORSE: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use horse emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Horse emoji
            body.textContent = '🐎';

            // Add galloping animation
            const keyframes = `
            @keyframes horseGallop${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-4px) scale(1.02); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-6px) scale(1.05); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-4px) scale(1.02); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `horseGallop${organism.id} 1.5s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_DOMESTIC_DOG: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use dog emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Dog emoji
            body.textContent = '🐶';

            // Add playful tail wagging animation
            const keyframes = `
            @keyframes dogWag${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) rotate(-2deg) scale(1.03); }
                50% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1.05); }
                75% { transform: translateZ(${organism.heightOffset}px) rotate(2deg) scale(1.03); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `dogWag${organism.id} 1.2s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_LEOPARD: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use leopard emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Leopard emoji
            body.textContent = '🐆';

            // Add stealthy prowling animation
            const keyframes = `
            @keyframes leopardStalk${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateX(0) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateX(-1px) translateY(-1px) scale(0.98); }
                50% { transform: translateZ(${organism.heightOffset}px) translateX(0) translateY(-2px) scale(1.01); }
                75% { transform: translateZ(${organism.heightOffset}px) translateX(1px) translateY(-1px) scale(0.98); }
                100% { transform: translateZ(${organism.heightOffset}px) translateX(0) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `leopardStalk${organism.id} 2.8s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_PLAINS_ZEBRA: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use zebra emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Zebra emoji
            body.textContent = '🦓';

            // Add herd movement animation
            const keyframes = `
            @keyframes zebraGraze${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
                33% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(-1deg) scale(1.02); }
                66% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) rotate(1deg) scale(0.98); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `zebraGraze${organism.id} 2.2s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_AMERICAN_BISON: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use bison emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Bison emoji
            body.textContent = '🦬';

            // Add powerful grazing animation
            const keyframes = `
            @keyframes bisonGraze${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) scale(1.01); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-3px) scale(1.03); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) scale(1.01); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `bisonGraze${organism.id} 3.5s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_DOMESTIC_CATTLE: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use cow emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Cow emoji
            body.textContent = '🐄';

            // Add gentle pastoral animation
            const keyframes = `
            @keyframes cowGraze${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
                33% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(-0.5deg) scale(1.01); }
                66% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) rotate(0.5deg) scale(0.99); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `cowGraze${organism.id} 2.8s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_GIRAFFE: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use giraffe emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Giraffe emoji
            body.textContent = '🦒';

            // Add tall, graceful swaying animation
            const keyframes = `
            @keyframes giraffeSway${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(-1deg) scale(1.01); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(1deg) scale(0.99); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `giraffeSway${organism.id} 3.8s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_GOLDEN_HAMSTER: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use hamster emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Hamster emoji
            body.textContent = '🐹';

            // Add quick, energetic scurrying animation
            const keyframes = `
            @keyframes hamsterScurry${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateX(0) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateX(-2px) translateY(-1px) scale(1.05); }
                50% { transform: translateZ(${organism.heightOffset}px) translateX(0) translateY(-2px) scale(0.95); }
                75% { transform: translateZ(${organism.heightOffset}px) translateX(2px) translateY(-1px) scale(1.05); }
                100% { transform: translateZ(${organism.heightOffset}px) translateX(0) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `hamsterScurry${organism.id} 0.8s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_GREEN_SEA_TURTLE: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use turtle emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Turtle emoji
            body.textContent = '🐢';

            // Add slow, steady movement animation
            const keyframes = `
            @keyframes turtleCrawl${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) scale(1.01); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `turtleCrawl${organism.id} 5s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_BALL_PYTHON: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use snake emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Snake emoji
            body.textContent = '🐍';

            // Add sinuous slithering animation
            const keyframes = `
            @keyframes snakeSlither${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateX(0) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateX(-1px) rotate(-3deg) scale(1.02); }
                50% { transform: translateZ(${organism.heightOffset}px) translateX(0) rotate(0deg) scale(0.98); }
                75% { transform: translateZ(${organism.heightOffset}px) translateX(1px) rotate(3deg) scale(1.02); }
                100% { transform: translateZ(${organism.heightOffset}px) translateX(0) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `snakeSlither${organism.id} 2.5s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_ENGLISH_OAK: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use deciduous tree emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Deciduous tree emoji
            body.textContent = '🌳';

            // Add gentle swaying animation
            const keyframes = `
            @keyframes deciduousSway${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) rotate(-1.5deg) scale(1.01); }
                75% { transform: translateZ(${organism.heightOffset}px) rotate(1.5deg) scale(0.99); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `deciduousSway${organism.id} 4.2s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_COMMON_DAISY: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use daisy emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Daisy emoji
            body.textContent = '🌼';

            // Add gentle flower swaying animation
            const keyframes = `
            @keyframes daisySway${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                33% { transform: translateZ(${organism.heightOffset}px) rotate(-2deg) scale(1.03); }
                66% { transform: translateZ(${organism.heightOffset}px) rotate(2deg) scale(0.97); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `daisySway${organism.id} 2.5s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_SPEARMINT: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use herb emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Herb emoji
            body.textContent = '🌿';

            // Add gentle herb rustling animation
            const keyframes = `
            @keyframes herbRustle${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) rotate(-3deg) scale(1.02); }
                50% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(0.98); }
                75% { transform: translateZ(${organism.heightOffset}px) rotate(3deg) scale(1.02); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `herbRustle${organism.id} 1.8s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_OX: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use ox emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Ox emoji
            body.textContent = '🐂';

            // Add strong, working animal animation
            const keyframes = `
            @keyframes oxWork${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) scale(1.02); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-3px) scale(1.04); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) scale(1.02); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `oxWork${organism.id} 3.2s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    'water-buffalo': {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use water buffalo emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Water buffalo emoji
            body.textContent = '🐃';

            // Add powerful wading animation
            const keyframes = `
            @keyframes buffaloWade${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
                33% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) rotate(-0.5deg) scale(1.01); }
                66% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(0.5deg) scale(1.03); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `buffaloWade${organism.id} 3.6s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_DOMESTIC_PIG: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use pig emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Pig emoji
            body.textContent = '🐖';

            // Add rooting/foraging animation
            const keyframes = `
            @keyframes pigRoot${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) rotate(-2deg) scale(1.03); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-3px) rotate(0deg) scale(0.97); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) rotate(2deg) scale(1.03); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `pigRoot${organism.id} 2.4s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_WILD_BOAR: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use boar emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Boar emoji
            body.textContent = '🐗';

            // Add aggressive foraging animation
            const keyframes = `
            @keyframes boarForage${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateX(0) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateX(-1px) translateY(-2px) scale(1.04); }
                50% { transform: translateZ(${organism.heightOffset}px) translateX(0) translateY(-4px) scale(0.96); }
                75% { transform: translateZ(${organism.heightOffset}px) translateX(1px) translateY(-2px) scale(1.04); }
                100% { transform: translateZ(${organism.heightOffset}px) translateX(0) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `boarForage${organism.id} 2.1s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_BIGHORN_SHEEP: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use ram emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Ram emoji
            body.textContent = '🐏';

            // Add sturdy mountain grazing animation
            const keyframes = `
            @keyframes ramGraze${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
                33% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(-1deg) scale(1.02); }
                66% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) rotate(1deg) scale(0.98); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `ramGraze${organism.id} 2.9s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_DOMESTIC_GOAT: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use goat emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Goat emoji
            body.textContent = '🐐';

            // Add agile climbing/browsing animation
            const keyframes = `
            @keyframes goatClimb${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-3px) scale(1.04); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-5px) scale(0.96); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-3px) scale(1.04); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `goatClimb${organism.id} 2.3s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_WHITE_RHINOCEROS: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use rhinoceros emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Rhinoceros emoji
            body.textContent = '🦏';

            // Add heavy, powerful movement animation
            const keyframes = `
            @keyframes rhinoCharge${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) scale(1.01); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-3px) scale(1.05); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) scale(1.01); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `rhinoCharge${organism.id} 4.1s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_HOUSE_CRICKET: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use cricket emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Cricket emoji
            body.textContent = '🦗';

            // Add quick hopping animation
            const keyframes = `
            @keyframes cricketHop${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-4px) scale(0.9); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-6px) scale(0.85); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) scale(0.95); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `cricketHop${organism.id} 1.1s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_DESERT_HAIRY_SCORPION: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use scorpion emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Scorpion emoji
            body.textContent = '🦂';

            // Add menacing tail movement animation
            const keyframes = `
            @keyframes scorpionStrike${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) rotate(-3deg) scale(1.05); }
                50% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(0.95); }
                75% { transform: translateZ(${organism.heightOffset}px) rotate(3deg) scale(1.05); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `scorpionStrike${organism.id} 2.7s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_COCONUT_PALM: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use palm tree emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Palm tree emoji
            body.textContent = '🌴';

            // Add tropical swaying animation
            const keyframes = `
            @keyframes palmSway${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) rotate(-2deg) scale(1.01); }
                75% { transform: translateZ(${organism.heightOffset}px) rotate(2deg) scale(0.99); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `palmSway${organism.id} 3.8s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_CHERRY_BLOSSOM: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use cherry blossom emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Cherry blossom emoji
            body.textContent = '🌸';

            // Add delicate petal flutter animation
            const keyframes = `
            @keyframes blossomFlutter${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                33% { transform: translateZ(${organism.heightOffset}px) rotate(-1deg) scale(1.04); }
                66% { transform: translateZ(${organism.heightOffset}px) rotate(1deg) scale(0.96); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `blossomFlutter${organism.id} 2.2s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_GARDEN_TULIP: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use tulip emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Tulip emoji
            body.textContent = '🌷';

            // Add elegant flower swaying animation
            const keyframes = `
            @keyframes tulipSway${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) rotate(-1.5deg) scale(1.02); }
                75% { transform: translateZ(${organism.heightOffset}px) rotate(1.5deg) scale(0.98); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `tulipSway${organism.id} 2.8s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_DROMEDARY_CAMEL: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use camel emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Camel emoji
            body.textContent = '🐪';

            // Add desert walking animation
            const keyframes = `
            @keyframes camelWalk${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) scale(1.01); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-3px) scale(1.02); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) scale(1.01); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `camelWalk${organism.id} 3.4s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_COMMON_HIPPOPOTAMUS: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use hippopotamus emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Hippopotamus emoji
            body.textContent = '🦛';

            // Add heavy aquatic movement animation
            const keyframes = `
            @keyframes hippoWade${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                33% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) scale(1.02); }
                66% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) scale(1.04); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `hippoWade${organism.id} 4.3s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_NORTH_AMERICAN_BEAVER: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use beaver emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Beaver emoji
            body.textContent = '🦫';

            // Add industrious working animation
            const keyframes = `
            @keyframes beaverWork${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(-1deg) scale(1.03); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-3px) rotate(0deg) scale(0.97); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(1deg) scale(1.03); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `beaverWork${organism.id} 2.6s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_EUROPEAN_HEDGEHOG: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use hedgehog emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Hedgehog emoji
            body.textContent = '🦔';

            // Add cautious foraging animation
            const keyframes = `
            @keyframes hedgehogForage${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) scale(1.05); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) scale(0.95); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) scale(1.05); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `hedgehogForage${organism.id} 2.0s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_KOALA: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use koala emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Koala emoji
            body.textContent = '🐨';

            // Add sleepy eucalyptus munching animation
            const keyframes = `
            @keyframes koalaMunch${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) scale(1.01); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `koalaMunch${organism.id} 4.8s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_GIANT_PANDA: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use panda emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Panda emoji
            body.textContent = '🐼';

            // Add gentle bamboo munching animation
            const keyframes = `
            @keyframes pandaMunch${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
                25% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) rotate(-0.5deg) scale(1.02); }
                50% { transform: translateZ(${organism.heightOffset}px) translateY(-2px) rotate(0deg) scale(0.98); }
                75% { transform: translateZ(${organism.heightOffset}px) translateY(-1px) rotate(0.5deg) scale(1.02); }
                100% { transform: translateZ(${organism.heightOffset}px) translateY(0) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `pandaMunch${organism.id} 3.6s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    },
    CARD_HIBISCUS: {
        render: function (organism, container) {
            const body = document.createElement('div');
            body.className = 'organism-body';
            body.style.overflow = 'visible';

            // Override to use hibiscus emoji - simple and perfect
            body.style.borderRadius = '0';
            body.style.boxShadow = 'none';
            body.style.backgroundColor = 'transparent';
            body.style.fontSize = `${organism.size * 0.8}px`;
            body.style.textAlign = 'center';
            body.style.lineHeight = '1';
            body.style.userSelect = 'none';
            body.style.pointerEvents = 'auto';
            body.style.display = 'flex';
            body.style.alignItems = 'center';
            body.style.justifyContent = 'center';
            body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';

            // Hibiscus emoji
            body.textContent = '🌺';

            // Add tropical flower blooming animation
            const keyframes = `
            @keyframes hibiscusBloom${organism.id} {
                0% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
                33% { transform: translateZ(${organism.heightOffset}px) rotate(-2deg) scale(1.05); }
                66% { transform: translateZ(${organism.heightOffset}px) rotate(2deg) scale(0.95); }
                100% { transform: translateZ(${organism.heightOffset}px) rotate(0deg) scale(1); }
            }`;

            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);

            body.style.animation = `hibiscusBloom${organism.id} 2.4s infinite ease-in-out`;

            container.appendChild(body);
            return body;
        }
    }
};

// Add missing emoji renderers
organismModels['CARD_PRICKLY_PEAR_CACTUS'] = {
    render: function (organism, container) {
        const body = document.createElement('div');
        body.className = 'organism-body';
        body.style.overflow = 'visible';
        body.style.borderRadius = '0';
        body.style.boxShadow = 'none';
        body.style.backgroundColor = 'transparent';
        body.style.fontSize = `${organism.size * 0.8}px`;
        body.style.textAlign = 'center';
        body.style.lineHeight = '1';
        body.style.userSelect = 'none';
        body.style.pointerEvents = 'auto';
        body.style.display = 'flex';
        body.style.alignItems = 'center';
        body.style.justifyContent = 'center';
        body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';
        body.textContent = '🌵';
        container.appendChild(body);
    }
};

organismModels['CARD_BUSH_CHERRY'] = {
    render: function (organism, container) {
        const body = document.createElement('div');
        body.className = 'organism-body';
        body.style.overflow = 'visible';
        body.style.borderRadius = '0';
        body.style.boxShadow = 'none';
        body.style.backgroundColor = 'transparent';
        body.style.fontSize = `${organism.size * 0.8}px`;
        body.style.textAlign = 'center';
        body.style.lineHeight = '1';
        body.style.userSelect = 'none';
        body.style.pointerEvents = 'auto';
        body.style.display = 'flex';
        body.style.alignItems = 'center';
        body.style.justifyContent = 'center';
        body.style.filter = 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))';
        body.textContent = '🍒';
        container.appendChild(body);
    }
};

// TODO, this is temp due to get getTrophicRole working for now with unknowns due to eggs and others not
// having capabilities. Maybe use future looking type
organismModels.unknown = organismModels.herbivore;

console.log('✅ Organism 2D rendering models loaded');

// Export for use in React components
export { organismModels };
