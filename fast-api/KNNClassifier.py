import pandas as pd
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split, GridSearchCV, cross_validate
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import StandardScaler
import warnings

warnings.filterwarnings("ignore", category=UserWarning)

class KeystrokeClassifier:

    def __init__(
        self,
        registered_biometric_file,
        typing_sample,
        knn_model_test_ratio=0.3,
        neighbour_size=3,
        weights='distance',
        metric="manhattan",
    ):
        self.registered_biometric_file = registered_biometric_file
        self.typing_sample = typing_sample
        self.knn_model_test_ratio = knn_model_test_ratio
        self.neighbour_size = neighbour_size
        self.weights = weights
        self.metric = metric
        self.feature_count = 97

        # Load data once for all methods
        self.df = pd.read_csv(self.registered_biometric_file, keep_default_na=False)
        self.X = self.df.iloc[:, 0 : self.feature_count]
        self.y = self.df["CLASS"]

        self.scaler = StandardScaler()
        self.X = pd.DataFrame(
            self.scaler.fit_transform(self.X),
            columns=self.X.columns
        )

    def _sample_to_df(self):
        raw = pd.DataFrame([self.typing_sample])
        scaled = self.scaler.transform(raw)
        return pd.DataFrame(scaled)

    def knn_manhattan_holdout(self):

        # Change random_state and watch accuracy jump around
        for seed in [10, 42, 99, 7, 123]:
            X_train, X_test, y_train, y_test = train_test_split(
                self.X, self.y, test_size=0.3, random_state=seed, stratify=self.y
            )
            model = KNeighborsClassifier(n_neighbors=self.neighbour_size, metric=self.metric, weights=self.weights)
            model.fit(X_train, y_train)
            print(f"seed={seed}  accuracy={accuracy_score(y_test, model.predict(X_test)):.4f}")

        holdout_accuracy = accuracy_score(y_test, model.predict(X_test))
        user_prediction = model.predict(self._sample_to_df())[0]

        print(f"[Holdout] Predicted: {user_prediction}, Accuracy: {holdout_accuracy:.4f}")
        return str(user_prediction), holdout_accuracy

    def get_cv_score(self):
        model = KNeighborsClassifier(
            n_neighbors=self.neighbour_size, metric="manhattan"
        )
        scores = cross_validate(model, self.X, self.y, scoring=["accuracy"])
        mean_accuracy = scores["test_accuracy"].mean() * 100

        return mean_accuracy

    def hyper_parameters_tuning(self):
        param_grid = {
            "n_neighbors": list(range(1, 10)),
            "weights": ["uniform", "distance"],
            "p": [1, 2],  # 1 = Manhattan, 2 = Euclidean
        }

        grid = GridSearchCV(KNeighborsClassifier(), param_grid, scoring="accuracy")
        grid.fit(self.X, self.y)

        return grid.best_score_, grid.best_params_, grid.best_estimator_