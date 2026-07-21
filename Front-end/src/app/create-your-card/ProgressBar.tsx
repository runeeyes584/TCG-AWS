interface Props {

    progress: number;

    total: number;

}

export default function ProgressBar({

    progress,

    total

}: Props) {

    return (

        <div className="deck-progress">

            <div className="deck-progress-header">

                <span>

                    Cards

                </span>

                <span>

                    {total}/30

                </span>

            </div>

            <div className="deck-progress-track">

                <div

                    className="deck-progress-fill"

                    style={{

                        width: `${progress}%`

                    }}

                />

            </div>

        </div>

    );

}